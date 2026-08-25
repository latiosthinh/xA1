import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { bot } from "@/lib/telegram";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 403 });
    }

    const update = await request.json();

    // Check message text
    const text = update?.message?.text || "";
    const chatId = update?.message?.chat?.id;

    if (text.startsWith("/reply")) {
      const parts = text.split(" ");
      if (parts.length >= 3) {
        const targetMemo = parts[1].trim();
        const content = parts.slice(2).join(" ").trim();

        await initDb();

        // Find matching order by publicMemo or id
        const matchingOrders = await db
          .select()
          .from(orders)
          .where(or(eq(orders.publicMemo, targetMemo), eq(orders.id, targetMemo)))
          .limit(1);

        if (matchingOrders.length > 0) {
          const matchedOrder = matchingOrders[0];
          const messageId = crypto.randomUUID();

          // Persist message for user
          await db.insert(orderMessages).values({
            id: messageId,
            orderId: matchedOrder.id,
            publicMemo: matchedOrder.publicMemo,
            sender: "ADMIN",
            content,
            status: "PENDING",
            createdAt: new Date(),
          });

          // Acknowledge back to admin in Telegram
          if (bot && chatId) {
            await bot.api.sendMessage(
              chatId,
              `✅ *Message delivered to storefront for \`${matchedOrder.publicMemo}\`!*\nThe customer's notification bell is now active.`,
              { parse_mode: "Markdown" }
            );
          }
        } else {
          if (bot && chatId) {
            await bot.api.sendMessage(
              chatId,
              `⚠️ Order \`${targetMemo}\` not found in database.`,
              { parse_mode: "Markdown" }
            );
          }
        }
      } else {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage:* \`/reply <OrderID> <Your message / account details>\``,
            { parse_mode: "Markdown" }
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Return 200 to prevent Telegram retry spam
  }
}
