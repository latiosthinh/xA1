import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages, products } from "@/lib/schema";
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

    const messageObj = update?.message || update?.channel_post;
    const rawText = (messageObj?.text || "").trim();
    const chatId = messageObj?.chat?.id;

    if (!rawText) {
      return NextResponse.json({ ok: true });
    }

    await initDb();

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

    // 2. /reply or /send: Check statusCode (1, 0, 2) or standard text
    if (command === "/reply" || command === "/send") {
      if (!restText) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage options:*\n• Status code update: \`/send <OrderID> 1\` (1=Success, 0=Failed, 2=Verify)\n• Custom message: \`/send <OrderID> <Message>\`\n• Global broadcast: \`/send <Message>\``,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      }

      const parts = restText.split(/\s+/);
      const possibleOrderId = parts[0].trim();

      // Check if first arg matches an order
      const matchingOrders = await db
        .select()
        .from(orders)
        .where(or(eq(orders.publicMemo, possibleOrderId), eq(orders.id, possibleOrderId)))
        .limit(1);

      if (matchingOrders.length > 0 && parts.length >= 2) {
        const matchedOrder = matchingOrders[0];
        const statusArg = parts[1].trim();
        const customNote = parts.slice(2).join(" ").trim();

        let content = "";
        let newOrderStatus = matchedOrder.status;
        let inventorySummary: string[] = [];

        // Code 1: Payment Success
        if (statusArg === "1") {
          content = "CODE:1" + (customNote ? ` | ${customNote}` : "");
          newOrderStatus = "COMPLETED";

          // Deduct stock if order was not already completed
          if (matchedOrder.status !== "COMPLETED") {
            try {
              const items = JSON.parse(matchedOrder.itemsJson || "[]");
              for (const item of items) {
                if (!item) continue;
                const qty = item.quantity || 1;
                
                // Find existing product by ID or fallback by name
                let existingProduct = null;
                if (item.id) {
                  const found = await db.select().from(products).where(eq(products.id, item.id)).limit(1);
                  if (found.length > 0) existingProduct = found[0];
                }
                if (!existingProduct && item.name) {
                  const found = await db.select().from(products).where(eq(products.name, item.name)).limit(1);
                  if (found.length > 0) existingProduct = found[0];
                }

                if (existingProduct) {
                  const currentStock = existingProduct.stock ?? 0;
                  const newStock = Math.max(0, currentStock - qty);
                  await db.update(products).set({ stock: newStock }).where(eq(products.id, existingProduct.id));
                  inventorySummary.push(`• ${existingProduct.name}: ${currentStock} -> ${newStock} (-${qty})`);
                }
              }
            } catch (err) {
              console.error("Failed to parse itemsJson or deduct stock:", err);
            }
          }
        }
        // Code 0: Payment Not Success / Rejected
        else if (statusArg === "0") {
          content = "CODE:0" + (customNote ? ` | ${customNote}` : "");
          newOrderStatus = "CANCELLED";
        }
        // Code 2: Payment Needs Verification
        else if (statusArg === "2") {
          content = "CODE:2" + (customNote ? ` | ${customNote}` : "");
          newOrderStatus = "PAID_WAITING_CONFIRM";
        }
        // Freeform reply
        else {
          content = parts.slice(1).join(" ").trim();
        }

        // Update order status if applicable
        if (newOrderStatus !== matchedOrder.status) {
          await db
            .update(orders)
            .set({ status: newOrderStatus, updatedAt: new Date() })
            .where(eq(orders.id, matchedOrder.id));
        }

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
          const statusLabel =
            statusArg === "1"
              ? "✅ PAYMENT SUCCESS"
              : statusArg === "0"
              ? "❌ PAYMENT REJECTED"
              : statusArg === "2"
              ? "⚠️ NEED VERIFICATION"
              : "💬 DIRECT MESSAGE";

          let messageText = `*${statusLabel} dispatched for \`${matchedOrder.publicMemo}\`!*\nStatus modal is now live for the customer.`;
          if (inventorySummary.length > 0) {
            messageText += `\n\n📦 *Inventory Updated:*\n` + inventorySummary.join("\n");
          }

          await bot.api.sendMessage(
            chatId,
            messageText,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      } else if (matchingOrders.length === 0 && parts.length === 1 && (command === "/reply" || command === "/send")) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `⚠️ Order not found or missing message content. Usage: \`/send <OrderID> 1\` or \`/send <OrderID> <Message>\``,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      } else {
        // Global broadcast
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
            `📢 *Global broadcast sent!*\nMessage: "${content}"`,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}



