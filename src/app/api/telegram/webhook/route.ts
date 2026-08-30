import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages, products, type Product } from "@/lib/schema";
import { eq, or, desc } from "drizzle-orm";
import { bot } from "@/lib/telegram";
import { formatDualPrice } from "@/lib/currency";
import crypto from "crypto";

const PAGE_SIZE = 5;

function renderProductList(
  items: Product[],
  page: number,
  totalPages: number
): { text: string; reply_markup: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } } {
  if (items.length === 0) {
    return {
      text: "📦 *Product Catalog is empty.*\nUse `/addproduct <name> | <price> | <stock> | [imageUrl] | [description]` to add one.",
      reply_markup: { inline_keyboard: [] },
    };
  }

  let text = `📦 *PRODUCT CATALOG (Page ${page}/${totalPages})*\n\n`;
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const item of items) {
    const stockStatus = (item.stock ?? 0) > 0 ? `IN STOCK (${item.stock})` : "OUT OF STOCK";
    text += `📦 *${item.name}* (ID: \`${item.id}\`)\n` +
      `💰 Price: ${formatDualPrice(item.price)} | 📊 Stock: ${stockStatus}\n\n`;

    keyboard.push([
      {
        text: `🔍 ${item.name} (${item.stock ?? 0})`,
        callback_data: `view:${item.id}`,
      },
    ]);
  }

  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (page > 1) {
    navRow.push({ text: "◀ Prev", callback_data: `list:${page - 1}` });
  }
  if (page < totalPages) {
    navRow.push({ text: "Next ▶", callback_data: `list:${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  return {
    text: text.trim(),
    reply_markup: { inline_keyboard: keyboard },
  };
}

function renderProductDetail(product: Product): {
  text: string;
  reply_markup: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
} {
  const stock = product.stock ?? 0;
  const stockStatus = stock > 0 ? `IN STOCK (${stock})` : "OUT OF STOCK (0)";

  const text = `📦 *PRODUCT DETAILS*\n\n` +
    `*ID:* \`${product.id}\`\n` +
    `*Name:* ${product.name}\n` +
    `*Price:* ${formatDualPrice(product.price)}\n` +
    `*Stock:* ${stockStatus}\n` +
    `*Image:* ${product.imageUrl || "_None_"}\n` +
    `*Description:* ${product.description || "_None_"}\n\n` +
    `_Use buttons below to adjust stock or edit/delete._`;

  const keyboard = [
    [
      { text: "➖ Stock -1", callback_data: `stock:${product.id}:-` },
      { text: "➕ Stock +1", callback_data: `stock:${product.id}:+` },
    ],
    [
      { text: "✏️ Edit Syntax", callback_data: `edit:${product.id}` },
      { text: "🗑️ Delete", callback_data: `del:${product.id}` },
    ],
    [
      { text: "◀ Back to List", callback_data: "back:list" },
    ],
  ];

  return { text, reply_markup: { inline_keyboard: keyboard } };
}

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

    await initDb();

    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    // --- HANDLE CALLBACK QUERIES (INLINE KEYBOARD ACTIONS) ---
    if (update?.callback_query) {
      const cb = update.callback_query;
      const cbChatId = cb?.message?.chat?.id;
      const cbMessageId = cb?.message?.message_id;
      const cbData = (cb?.data || "").trim();
      const cbId = cb?.id;

      // Re-authorize chatId against TELEGRAM_ADMIN_CHAT_ID
      if (!adminChatId || String(cbChatId) !== String(adminChatId)) {
        if (bot && cbId) {
          await bot.api.answerCallbackQuery(cbId, {
            text: "⛔ Unauthorized action.",
            show_alert: true,
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (!bot || !cbChatId || !cbMessageId) {
        return NextResponse.json({ ok: true });
      }

      // 1. back:list or list:<page>
      if (cbData === "back:list" || cbData.startsWith("list:")) {
        const page = cbData.startsWith("list:") ? Math.max(1, parseInt(cbData.split(":")[1], 10) || 1) : 1;
        const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
        const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
        const currentPage = Math.min(page, totalPages);
        const pageItems = allProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

        const rendered = renderProductList(pageItems, currentPage, totalPages);
        await bot.api.editMessageText(cbChatId, cbMessageId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 2. view:<id>
      if (cbData.startsWith("view:")) {
        const prodId = cbData.split(":")[1];
        const found = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
        if (found.length === 0) {
          await bot.api.answerCallbackQuery(cbId, { text: "Product not found.", show_alert: true });
          return NextResponse.json({ ok: true });
        }
        const rendered = renderProductDetail(found[0]);
        await bot.api.editMessageText(cbChatId, cbMessageId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 3. stock:<id>:+ or stock:<id>:-
      if (cbData.startsWith("stock:")) {
        const [, prodId, action] = cbData.split(":");
        const found = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
        if (found.length === 0) {
          await bot.api.answerCallbackQuery(cbId, { text: "Product not found.", show_alert: true });
          return NextResponse.json({ ok: true });
        }
        const currentStock = found[0].stock ?? 0;
        const newStock = action === "+" ? currentStock + 1 : Math.max(0, currentStock - 1);

        await db.update(products).set({ stock: newStock }).where(eq(products.id, prodId));

        const updated = { ...found[0], stock: newStock };
        const rendered = renderProductDetail(updated);
        await bot.api.editMessageText(cbChatId, cbMessageId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
        await bot.api.answerCallbackQuery(cbId, { text: `Stock updated: ${newStock}` });
        return NextResponse.json({ ok: true });
      }

      // 4. edit:<id>
      if (cbData.startsWith("edit:")) {
        const prodId = cbData.split(":")[1];
        const found = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
        if (found.length === 0) {
          await bot.api.answerCallbackQuery(cbId, { text: "Product not found.", show_alert: true });
          return NextResponse.json({ ok: true });
        }
        const p = found[0];
        const editSyntax = `/editproduct ${p.id} | ${p.name} | ${p.price} | ${p.stock ?? 0} | ${p.imageUrl || ""} | ${p.description || ""}`;
        await bot.api.sendMessage(
          cbChatId,
          `✏️ *To edit product, copy & modify this command:*\n\n\`${editSyntax}\``,
          { parse_mode: "Markdown" }
        );
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 5. del:<id> -> Show confirmation keyboard
      if (cbData.startsWith("del:") && !cbData.startsWith("del:confirm:")) {
        const prodId = cbData.split(":")[1];
        const found = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
        if (found.length === 0) {
          await bot.api.answerCallbackQuery(cbId, { text: "Product not found.", show_alert: true });
          return NextResponse.json({ ok: true });
        }
        await bot.api.editMessageText(
          cbChatId,
          cbMessageId,
          `⚠️ *Are you sure you want to delete product "${found[0].name}"?*\nThis action cannot be undone.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Confirm Delete", callback_data: `del:confirm:${prodId}` },
                  { text: "❌ Cancel", callback_data: `view:${prodId}` },
                ],
              ],
            },
          }
        );
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 6. del:confirm:<id> -> Execute deletion
      if (cbData.startsWith("del:confirm:")) {
        const prodId = cbData.split(":")[2];
        await db.delete(products).where(eq(products.id, prodId));
        await bot.api.answerCallbackQuery(cbId, { text: "Product deleted successfully." });

        const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
        const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
        const pageItems = allProducts.slice(0, PAGE_SIZE);
        const rendered = renderProductList(pageItems, 1, totalPages);

        await bot.api.editMessageText(
          cbChatId,
          cbMessageId,
          `🗑️ *Product deleted.*\n\n` + rendered.text,
          {
            parse_mode: "Markdown",
            reply_markup: rendered.reply_markup,
          }
        );
        return NextResponse.json({ ok: true });
      }

      await bot.api.answerCallbackQuery(cbId);
      return NextResponse.json({ ok: true });
    }

    // --- HANDLE TEXT MESSAGES ---
    const messageObj = update?.message || update?.channel_post;
    const rawText = (messageObj?.text || "").trim();
    const chatId = messageObj?.chat?.id;

    if (!rawText) {
      return NextResponse.json({ ok: true });
    }

    // Sender authorization check against TELEGRAM_ADMIN_CHAT_ID
    if (adminChatId && String(chatId) !== String(adminChatId)) {
      console.warn("Unauthorized Telegram message from chatId:", chatId);
      if (bot && chatId) {
        await bot.api.sendMessage(chatId, "⛔ *Access Denied.* You are not authorized to use this bot.", {
          parse_mode: "Markdown",
        });
      }
      return NextResponse.json({ ok: true });
    }

    const firstWord = rawText.split(/\s+/)[0];
    const command = firstWord.split("@")[0].toLowerCase();
    const restText = rawText.substring(firstWord.length).trim();

    // 1. /help or /start
    if (command === "/help" || command === "/start") {
      if (bot && chatId) {
        const helpText = `🛠️ *MMO STORE ADMIN BOT COMMANDS*\n\n` +
          `📦 *Product Catalog:*\n` +
          `• \`/products\` or \`/list\` - Browse products with interactive buttons\n` +
          `• \`/product <id>\` or \`/view <id>\` - View product details & manage stock\n` +
          `• \`/setstock <id> <stock>\` - Update stock level directly\n` +
          `• \`/addproduct <name> | <price> | <stock> | [imageUrl] | [description]\` - Create product\n` +
          `• \`/editproduct <id> | <name> | <price> | <stock> | [imageUrl] | [description]\` - Edit product\n` +
          `• \`/delproduct <id>\` - Delete product\n\n` +
          `💳 *Order Fulfillment:*\n` +
          `• \`/send <OrderID> 1\` - Complete order & auto-deduct stock\n` +
          `• \`/send <OrderID> 0\` - Reject order\n` +
          `• \`/send <OrderID> 2\` - Mark order needing verification\n` +
          `• \`/send <OrderID> <Message>\` - Send custom message/credentials\n\n` +
          `📢 *Broadcasts:*\n` +
          `• \`/broadcast <message>\` - Global announcement to all visitors`;

        await bot.api.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
      }
      return NextResponse.json({ ok: true });
    }

    // 2. /products or /list
    if (command === "/products" || command === "/list") {
      const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
      const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
      const pageItems = allProducts.slice(0, PAGE_SIZE);

      const rendered = renderProductList(pageItems, 1, totalPages);
      if (bot && chatId) {
        await bot.api.sendMessage(chatId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
      }
      return NextResponse.json({ ok: true });
    }

    // 3. /product <id> or /view <id>
    if (command === "/product" || command === "/view") {
      const prodId = restText.trim();
      if (!prodId) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `ℹ️ *Usage:* \`/product <id>\` or \`/view <id>\``, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const matching = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
      if (matching.length === 0) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `⚠️ Product \`${prodId}\` not found.`, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const rendered = renderProductDetail(matching[0]);
      if (bot && chatId) {
        await bot.api.sendMessage(chatId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
      }
      return NextResponse.json({ ok: true });
    }

    // 4. /setstock <id> <stock>
    if (command === "/setstock") {
      const parts = restText.split(/\s+/);
      const prodId = parts[0]?.trim();
      const stockArg = parts[1]?.trim();

      if (!prodId || stockArg === undefined || isNaN(Number(stockArg))) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `ℹ️ *Usage:* \`/setstock <id> <stock>\` (e.g. \`/setstock abc-123 10\`)`, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const matching = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
      if (matching.length === 0) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `⚠️ Product \`${prodId}\` not found.`, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const newStock = Math.max(0, parseInt(stockArg, 10));
      await db.update(products).set({ stock: newStock }).where(eq(products.id, prodId));

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `✅ *Stock updated for "${matching[0].name}"*\n📊 New Stock: \`${newStock}\``,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 5. /addproduct <name> | <price> | <stock> | [imageUrl] | [description]
    if (command === "/addproduct") {
      const parts = restText.split("|").map((p: string) => p.trim());
      const name = parts[0];
      const priceStr = parts[1];
      const stockStr = parts[2];
      const imageUrl = parts[3] || "";
      const description = parts[4] || "";

      const price = Number(priceStr);
      if (!name || isNaN(price) || price < 0) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage:* \`/addproduct <name> | <price> | <stock> | [imageUrl] | [description]\`\n\n` +
              `*Example:* \`/addproduct Netflix 1 Month | 70000 | 20 | https://img.com/pic.png | 4K Ultra HD\``,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      }

      const stock = stockStr !== undefined && !isNaN(Number(stockStr)) ? Math.max(0, parseInt(stockStr, 10)) : 0;
      const newId = crypto.randomUUID();

      await db.insert(products).values({
        id: newId,
        name,
        price,
        stock,
        imageUrl,
        description,
        createdAt: new Date(),
      });

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `✅ *Product Created Successfully!*\n\n` +
            `*ID:* \`${newId}\`\n` +
            `*Name:* ${name}\n` +
            `*Price:* ${formatDualPrice(price)}\n` +
            `*Stock:* ${stock}\n` +
            `*Image:* ${imageUrl || "_None_"}\n` +
            `*Description:* ${description || "_None_"}`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 6. /editproduct <id> | <name> | <price> | <stock> | [imageUrl] | [description]
    if (command === "/editproduct") {
      const parts = restText.split("|").map((p: string) => p.trim());
      const prodId = parts[0];
      const name = parts[1];
      const priceStr = parts[2];
      const stockStr = parts[3];
      const imageUrl = parts[4];
      const description = parts[5];

      if (!prodId) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage:* \`/editproduct <id> | <name> | <price> | <stock> | [imageUrl] | [description]\``,
            { parse_mode: "Markdown" }
          );
        }
        return NextResponse.json({ ok: true });
      }

      const matching = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
      if (matching.length === 0) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `⚠️ Product \`${prodId}\` not found.`, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const existing = matching[0];
      const newName = name !== undefined && name !== "" ? name : existing.name;
      const newPrice = priceStr !== undefined && !isNaN(Number(priceStr)) ? Number(priceStr) : existing.price;
      const newStock =
        stockStr !== undefined && !isNaN(Number(stockStr))
          ? Math.max(0, parseInt(stockStr, 10))
          : (existing.stock ?? 0);
      const newImageUrl = imageUrl !== undefined ? imageUrl : existing.imageUrl;
      const newDescription = description !== undefined ? description : existing.description;

      await db
        .update(products)
        .set({
          name: newName,
          price: newPrice,
          stock: newStock,
          imageUrl: newImageUrl,
          description: newDescription,
        })
        .where(eq(products.id, prodId));

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `✅ *Product Updated Successfully!*\n\n` +
            `*ID:* \`${prodId}\`\n` +
            `*Name:* ${newName}\n` +
            `*Price:* ${formatDualPrice(newPrice)}\n` +
            `*Stock:* ${newStock}\n` +
            `*Image:* ${newImageUrl || "_None_"}\n` +
            `*Description:* ${newDescription || "_None_"}`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 7. /delproduct <id>
    if (command === "/delproduct") {
      const prodId = restText.trim();
      if (!prodId) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `ℹ️ *Usage:* \`/delproduct <id>\``, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      const matching = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
      if (matching.length === 0) {
        if (bot && chatId) {
          await bot.api.sendMessage(chatId, `⚠️ Product \`${prodId}\` not found.`, {
            parse_mode: "Markdown",
          });
        }
        return NextResponse.json({ ok: true });
      }

      await db.delete(products).where(eq(products.id, prodId));

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `🗑️ *Product "${matching[0].name}" (\`${prodId}\`) deleted successfully.*`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 8. /broadcast <message>
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

    // 9. /reply or /send: Check statusCode (1, 0, 2) or standard text
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
        const inventorySummary: string[] = [];

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
