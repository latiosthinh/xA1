import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { bot } from "@/lib/telegram";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json({ status: "Telegram webhook endpoint active" });
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secret && secret !== expectedSecret) {
      console.warn("Telegram webhook secret mismatch:", { received: secret, expected: expectedSecret });
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 403 });
    }

    const update = await request.json();
    console.log("Telegram update received:", JSON.stringify(update));

    // Handle message from user or channel/group post
    const messageObj = update?.message || update?.channel_post;
    const rawText = (messageObj?.text || "").trim();
    const chatId = messageObj?.chat?.id;

    if (!rawText) {
      return NextResponse.json({ ok: true });
    }

    await initDb();

    // Support commands starting with /send, /reply, /broadcast, OR handle bot mentions like /send@botname
    const firstWord = rawText.split(/\s+/)[0];
    const command = firstWord.split("@")[0].toLowerCase();
    const restText = rawText.substring(firstWord.length).trim();

    // 1. /broadcast <message>
    if (command === "/broadcast") {
      if (!restText) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `ℹ️ *Usage:* \`/broadcast <Any announcement message>\``, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const messageId = crypto.randomUUID();
      await db.insert(orderMessages).values({
        id: messageId,
        orderId: null,
        publicMemo: "GLOBAL",
        sender: "ADMIN",
        content: restText,
        status: "PENDING",
        createdAt: new Date(),
      });

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `📢 *Global Broadcast Dispatched!*\nAll online site visitors will see this announcement.`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 2. /reply <orderId> <content>
    if (command === "/reply") {
      const parts = restText.split(/\s+/);
      if (parts.length < 2) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage:* \`/reply <OrderID> <Your message / account details>\``,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      }

      const targetMemo = parts[0].trim();
      const content = parts.slice(1).join(" ").trim();

      const matchingOrders = await db
        .select()
        .from(orders)
        .where(or(eq(orders.publicMemo, targetMemo), eq(orders.id, targetMemo)))
        .limit(1);

      if (matchingOrders.length > 0) {
        const matchedOrder = matchingOrders[0];
        const messageId = crypto.randomUUID();

        await db.insert(orderMessages).values({
          id: messageId,
          orderId: matchedOrder.id,
          publicMemo: matchedOrder.publicMemo,
          sender: "ADMIN",
          content,
          status: "PENDING",
          createdAt: new Date(),
        });

        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `✅ *Message delivered to storefront for \`${matchedOrder.publicMemo}\`!*\nCustomer notification bell is now active.`,
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
      return NextResponse.json({ ok: true });
    }

    // 3. /send [orderId] <content> OR /send <content>
    if (command === "/send") {
      if (!restText) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage options:*\n• Direct to order: \`/send <OrderID> <Message>\`\n• Global broadcast: \`/send <Message>\``,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      }

      const parts = restText.split(/\s+/);
      const possibleOrderId = parts[0].trim();

      // Check if first word matches an existing order
      const matchingOrders = await db
        .select()
        .from(orders)
        .where(or(eq(orders.publicMemo, possibleOrderId), eq(orders.id, possibleOrderId)))
        .limit(1);

      if (matchingOrders.length > 0 && parts.length >= 2) {
        const matchedOrder = matchingOrders[0];
        const content = parts.slice(1).join(" ").trim();
        const messageId = crypto.randomUUID();

        await db.insert(orderMessages).values({
          id: messageId,
          orderId: matchedOrder.id,
          publicMemo: matchedOrder.publicMemo,
          sender: "ADMIN",
          content,
          status: "PENDING",
          createdAt: new Date(),
        });

        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `✅ *Message sent to customer of \`${matchedOrder.publicMemo}\`!*`,
            { parse_mode: "Markdown" }
          );
        }
      } else {
        // Broadcast globally
        const content = restText;
        const messageId = crypto.randomUUID();

        await db.insert(orderMessages).values({
          id: messageId,
          orderId: null,
          publicMemo: "GLOBAL",
          sender: "ADMIN",
          content,
          status: "PENDING",
          createdAt: new Date(),
        });

        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `📢 *Global site broadcast sent!*\nMessage: "${content}"`,
            { parse_mode: "Markdown" }
          );
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 4. Any raw text in admin group/chat without command prefix -> default to global broadcast
    // If user just types a message in the group, deliver it globally
    if (!rawText.startsWith("/")) {
      const messageId = crypto.randomUUID();
      await db.insert(orderMessages).values({
        id: messageId,
        orderId: null,
        publicMemo: "GLOBAL",
        sender: "ADMIN",
        content: rawText,
        status: "PENDING",
        createdAt: new Date(),
      });

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `📢 *Broadcast sent to site!*\n"${rawText}"`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}


