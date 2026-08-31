import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages, products, type Product } from "@/lib/schema";
import { eq, or, desc } from "drizzle-orm";
import { bot } from "@/lib/telegram";
import { formatDualPrice } from "@/lib/currency";
import { parseProductDescription, formatProductDescription } from "@/lib/description";
import crypto from "crypto";

const PAGE_SIZE = 10;

function getProductIcon(name: string): string {
  const lower = (name || "").toLowerCase();

  // AI & LLM Tools
  if (lower.includes("claude") || lower.includes("anthropic")) return "🧡"; // Claude orange
  if (lower.includes("cursor")) return "⚡"; // Cursor fast dev
  if (lower.includes("gemini") || lower.includes("google")) return "✨"; // Gemini sparkle
  if (lower.includes("deepseek")) return "🐳"; // DeepSeek blue whale logo
  if (lower.includes("chatgpt") || lower.includes("openai") || lower.includes("gpt") || lower.includes("sora")) return "🟢"; // OpenAI green/round
  if (lower.includes("kiro") || lower.includes("midjourney") || lower.includes("krea") || lower.includes("runway") || lower.includes("flux")) return "🎨"; // Creative AI art
  if (lower.includes("elevenlabs") || lower.includes("voice")) return "🗣️"; // ElevenLabs voice AI
  if (lower.includes("huggingface") || lower.includes("hf")) return "🤗"; // HuggingFace emoji
  if (lower.includes("replit")) return "💻"; // Replit cloud coding
  if (lower.includes("copilot") || lower.includes("github") || lower.includes("gitlab")) return "🐙"; // GitHub Octocat

  // Video & Audio Streaming
  if (lower.includes("capcut") || lower.includes("premiere") || lower.includes("filmora") || lower.includes("video")) return "🎬"; // Video editor clapper
  if (lower.includes("youtube")) return "▶️"; // YouTube play red
  if (lower.includes("netflix")) return "🍿"; // Netflix popcorn/movies
  if (lower.includes("disney") || lower.includes("hulu") || lower.includes("hbo") || lower.includes("film")) return "📺"; // TV shows
  if (lower.includes("spotify") || lower.includes("apple music") || lower.includes("deezer") || lower.includes("sound") || lower.includes("music")) return "🎧"; // Music headphones

  // Education & Language Learning
  if (lower.includes("coursera") || lower.includes("udemy") || lower.includes("datacamp") || lower.includes("pluralsight") || lower.includes("edu") || lower.includes("learn")) return "🎓"; // Graduation cap
  if (lower.includes("duolingo") || lower.includes("elsa") || lower.includes("speak") || lower.includes("ielts")) return "🦉"; // Duolingo owl

  // Design & Creative
  if (lower.includes("canva") || lower.includes("adobe") || lower.includes("photoshop") || lower.includes("figma") || lower.includes("illustrator")) return "🎨"; // Design palette
  if (lower.includes("apple")) return "🍏"; // Apple

  // Productivity, Notes & Office
  if (lower.includes("notion") || lower.includes("grammarly") || lower.includes("quillbot")) return "📝"; // Notion notes
  if (lower.includes("office") || lower.includes("microsoft") || lower.includes("365") || lower.includes("win") || lower.includes("excel")) return "🪟"; // Windows/Office
  if (lower.includes("gmail") || lower.includes("mail")) return "✉️"; // Gmail envelope
  if (lower.includes("drive") || lower.includes("cloud") || lower.includes("dropbox") || lower.includes("icloud") || lower.includes("storage")) return "☁️"; // Cloud storage
  if (lower.includes("zoom") || lower.includes("meet")) return "📹"; // Zoom cam

  // Social & Gaming
  if (lower.includes("telegram") || lower.includes("tele") || lower.includes("tg")) return "✈️"; // Telegram paper plane
  if (lower.includes("discord") || lower.includes("nitro")) return "🚀"; // Discord Nitro rocket
  if (lower.includes("steam") || lower.includes("game") || lower.includes("playstation") || lower.includes("xbox") || lower.includes("nintendo")) return "🎮"; // Gaming

  // Security, VPN & Keys
  if (lower.includes("vpn") || lower.includes("nord") || lower.includes("surfshark") || lower.includes("expressvpn") || lower.includes("warp") || lower.includes("1.1.1.1")) return "🛡️"; // VPN shield
  if (lower.includes("key") || lower.includes("license") || lower.includes("account") || lower.includes("acc")) return "🔑"; // License key

  // Finance & Trading
  if (lower.includes("tradingview") || lower.includes("crypto") || lower.includes("binance")) return "📈"; // Chart up

  return "📦";
}

function renderHelpMenu(): {
  text: string;
  reply_markup: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
} {
  const text = `🛠️ *MMO STORE ADMIN BOT*\n\n` +
    `📦 *Product Catalog:*\n` +
    `• \`/products\` or \`/list\` - Browse products with interactive buttons\n` +
    `• \`/product <id>\` - View details & adjust stock with + / - buttons\n` +
    `• \`/setstock <id> <stock>\` - Update stock level directly\n` +
    `• \`/addproduct <name> | <price> | <stock> | [imageUrl] | [duration] | [type] | [warranty]\`\n` +
    `• \`/editproduct <id> | <name> | <price> | <stock> | [imageUrl] | [duration] | [type] | [warranty]\`\n` +
    `• \`/delproduct <id>\` - Delete product\n\n` +
    `💳 *Order Fulfillment:*\n` +
    `• \`/send <OrderID> 1\` - Complete order & auto-deduct stock\n` +
    `• \`/send <OrderID> 0\` - Reject order\n` +
    `• \`/send <OrderID> 2\` - Mark order needing verification\n` +
    `• \`/send <OrderID> <Message>\` - Send custom credentials\n\n` +
    `📢 *Broadcasts:*\n` +
    `• \`/broadcast <message>\` - Global announcement to all visitors\n\n` +
    `✨ *Tools:*\n` +
    `• \`/emoji <custom emojis>\` - Get custom emoji IDs from your pack\n\n` +
    `_👇 Tap below for quick actions or command templates:_`;

  const keyboard = [
    [
      { text: "📦 Browse Products", callback_data: "list:1" },
      { text: "➕ Add Product", callback_data: "help:add" },
    ],
    [
      { text: "💳 Orders Guide", callback_data: "help:orders" },
      { text: "📢 Broadcast Guide", callback_data: "help:broadcast" },
    ],
  ];

  return { text, reply_markup: { inline_keyboard: keyboard } };
}

type TelegramInlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

function renderCustomerProductList(
  items: Product[],
  page: number,
  totalPages: number
): { text: string; reply_markup: { inline_keyboard: TelegramInlineButton[][] } } {
  const storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://store.xa1.space";

  if (items.length === 0) {
    return {
      text: `🛍️ *Welcome to MMO Store!*\n\nNo products currently listed. Check back soon!`,
      reply_markup: {
        inline_keyboard: [[{ text: "🌐 Open Web Store", url: storeUrl }]],
      },
    };
  }

  let text = `🛍️ *MMO STORE CATALOG (Page ${page}/${totalPages})*\n\n` +
    `_Tap any item to view details & buy instantly:_\n\n`;

  const keyboard: TelegramInlineButton[][] = [];

  for (const item of items) {
    const icon = getProductIcon(item.name);
    const inStock = (item.stock ?? 0) > 0;
    const stockStatus = inStock ? `🟢 In Stock (${item.stock})` : "🔴 Sold Out";

    text += `${icon} *${item.name}*\n` +
      `💰 Price: *${formatDualPrice(item.price)}* | ${stockStatus}\n`;

    const specs = [item.duration, item.deliveryType, item.warranty ? `Warranty ${item.warranty.replace(/^warranty\s*/i, "")}` : ""].filter(Boolean);
    if (specs.length > 0) {
      text += `📋 _${specs.join(" • ")}_\n`;
    }
    text += `\n`;

    if (inStock) {
      keyboard.push([
        {
          text: `🛒 Buy ${item.name} - ${formatDualPrice(item.price)}`,
          url: `${storeUrl}?buy=${item.id}`,
        },
      ]);
    } else {
      keyboard.push([
        {
          text: `🚫 ${item.name} (Sold Out)`,
          callback_data: "buy:soldout",
        },
      ]);
    }
  }

  const navRow: TelegramInlineButton[] = [];
  if (page > 1) {
    navRow.push({ text: "◀ Prev", callback_data: `userlist:${page - 1}` });
  }
  if (page < totalPages) {
    navRow.push({ text: "Next ▶", callback_data: `userlist:${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  keyboard.push([{ text: "🌐 Open Storefront in Browser", url: storeUrl }]);

  return {
    text: text.trim(),
    reply_markup: { inline_keyboard: keyboard },
  };
}

function renderProductList(
  items: Product[],
  page: number,
  totalPages: number,
  filter: "all" | "instock" = "all",
  mode: "view" | "edit" = "view"
): { text: string; reply_markup: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } } {
  const filterTitle = filter === "instock" ? " (In-Stock Only)" : "";
  const modeTitle = mode === "edit" ? " ✏️ CHOOSE TO EDIT" : "";
  if (items.length === 0) {
    return {
      text: `📦 *Product Catalog is empty${filter === "instock" ? " (No in-stock products)" : ""}.*\nUse \`/addproduct <name> | <price> | <stock> | [imageUrl] | [description]\` to add one.`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: filter === "instock" ? "👁️ View All" : "🟢 In-Stock Only",
              callback_data: filter === "instock" ? `list:1:all:${mode}` : `list:1:instock:${mode}`,
            },
            { text: "➕ Add Product", callback_data: "help:add" },
          ],
        ],
      },
    };
  }

  let text = `📦 *PRODUCT CATALOG${modeTitle}${filterTitle} (Page ${page}/${totalPages})*\n\n`;
  if (mode === "edit") {
    text += `_Select a product below to get the edit command template:_\n\n`;
  }
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const item of items) {
    const icon = getProductIcon(item.name);
    const inStock = (item.stock ?? 0) > 0;
    const stockStatus = inStock ? `🟢 IN STOCK (${item.stock})` : "🔴 OUT OF STOCK";
    text += `${icon} *${item.name}* (ID: \`${item.id}\`)\n` +
      `💰 Price: ${formatDualPrice(item.price)} | 📊 Stock: ${stockStatus}\n\n`;

    const buttonStockIndicator = inStock ? `🟢 (${item.stock})` : `🔴 (0)`;
    const cb = mode === "edit" ? `edit:${item.id}` : `view:${item.id}`;
    const btnLabel = mode === "edit" ? `✏️ ${item.name}` : `${icon} ${item.name} ${buttonStockIndicator}`;
    keyboard.push([
      {
        text: btnLabel,
        callback_data: cb,
      },
    ]);
  }

  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (page > 1) {
    navRow.push({ text: "◀ Prev", callback_data: `list:${page - 1}:${filter}:${mode}` });
  }
  navRow.push({ text: `🔄 Refresh (p.${page})`, callback_data: `refresh:list:${page}:${filter}:${mode}` });
  if (page < totalPages) {
    navRow.push({ text: "Next ▶", callback_data: `list:${page + 1}:${filter}:${mode}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  // Filter toggle row + Action buttons
  keyboard.push([
    {
      text: filter === "instock" ? "👁️ Show: All Products" : "🟢 Show: In-Stock Only",
      callback_data: filter === "instock" ? `list:1:all:${mode}` : `list:1:instock:${mode}`,
    },
  ]);

  if (mode === "edit") {
    keyboard.push([
      { text: "👁️ Back to Normal List", callback_data: "list:1:all:view" },
      { text: "🛠️ Menu", callback_data: "help:menu" },
    ]);
  } else {
    keyboard.push([
      { text: "✏️ Choose to Edit", callback_data: "list:1:all:edit" },
      { text: "➕ Add Product", callback_data: "help:add" },
      { text: "🛠️ Menu", callback_data: "help:menu" },
    ]);
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
  const icon = getProductIcon(product.name);
  const stock = product.stock ?? 0;
  const inStock = stock > 0;
  const stockStatus = inStock ? `🟢 IN STOCK (${stock})` : "🔴 OUT OF STOCK (0)";

  // Hidden image preview link so Telegram renders the product image preview at top
  const imagePreview = product.imageUrl && product.imageUrl.startsWith("http")
    ? `[\u200B](${product.imageUrl})`
    : "";

  const specs = {
    duration: product.duration || "",
    type: product.deliveryType || "",
    warranty: product.warranty || "",
  };

  const specsText = (specs.duration || specs.type || specs.warranty)
    ? `*Specs:*\n` +
      (specs.duration ? `• ⏱️ Duration: \`${specs.duration}\`\n` : "") +
      (specs.type ? `• 📦 Type: \`${specs.type}\`\n` : "") +
      (specs.warranty ? `• 🛡️ Warranty: \`Warranty ${specs.warranty.replace(/^warranty\s*/i, "")}\`\n` : "")
    : `*Specs:* _None_\n`;

  const text = `${imagePreview}${icon} *PRODUCT DETAILS*\n\n` +
    `*ID:* \`${product.id}\`\n` +
    `*Name:* ${product.name}\n` +
    `*Price:* ${formatDualPrice(product.price)}\n` +
    `*Stock:* ${stockStatus}\n` +
    `*Image:* ${product.imageUrl ? `[View Image](${product.imageUrl})` : "_None_"}\n` +
    specsText + `\n` +
    `_Tap any attribute below to edit directly:_`;

  const keyboard = [
    [
      { text: "🏷️ Edit Name", callback_data: `input:name:${product.id}` },
      { text: "💰 Edit Price", callback_data: `input:price:${product.id}` },
    ],
    [
      { text: "📦 Edit Stock", callback_data: `input:stock:${product.id}` },
      { text: "⏱️ Edit Duration", callback_data: `input:duration:${product.id}` },
    ],
    [
      { text: "📦 Edit Type", callback_data: `input:type:${product.id}` },
      { text: "🛡️ Edit Warranty", callback_data: `input:warranty:${product.id}` },
    ],
    [
      { text: "🖼️ Edit Image", callback_data: `input:image:${product.id}` },
      { text: "🗑️ Delete Product", callback_data: `del:${product.id}` },
    ],
    [
      { text: "➖ Stock -1", callback_data: `stock:${product.id}:-` },
      { text: `📊 Stock: ${stock}`, callback_data: `stock:${product.id}:noop` },
      { text: "➕ Stock +1", callback_data: `stock:${product.id}:+` },
    ],
    [
      { text: "🔄 Refresh", callback_data: `refresh:view:${product.id}` },
      { text: "◀ Back to List", callback_data: "list:1:all:edit" },
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

    const rawAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
    const adminChatIds = rawAdminChatId
      .split(",")
      .map((id) => id.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);

    const isAuthorized = (id: string) => adminChatIds.length > 0 && adminChatIds.includes(id);

    // --- HANDLE CALLBACK QUERIES (INLINE KEYBOARD ACTIONS) ---
    if (update?.callback_query) {
      const cb = update.callback_query;
      const cbChatId = String(cb?.message?.chat?.id || "").trim();
      const cbMessageId = cb?.message?.message_id;
      const cbData = (cb?.data || "").trim();
      const cbId = cb?.id;

      // Re-authorize chatId against TELEGRAM_ADMIN_CHAT_ID
      if (!isAuthorized(cbChatId)) {
        if (bot && cbId) {
          await bot.api.answerCallbackQuery(cbId, {
            text: `⛔ Unauthorized. Your ID: ${cbChatId} (Allowed: ${adminChatIds.join(", ") || "NONE"})`,
            show_alert: true,
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (!bot || !cbChatId || !cbMessageId) {
        return NextResponse.json({ ok: true });
      }

      // 0. userlist:<page> (Customer browsing for purchase)
      if (cbData.startsWith("userlist:")) {
        const page = Math.max(1, parseInt(cbData.split(":")[1] || "1", 10));
        const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
        const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
        const currentPage = Math.min(page, totalPages);
        const pageItems = allProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

        const rendered = renderCustomerProductList(pageItems, currentPage, totalPages);
        await bot.api.editMessageText(cbChatId, cbMessageId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      if (cbData === "buy:soldout") {
        await bot.api.answerCallbackQuery(cbId, {
          text: "⚠️ This item is currently out of stock. Please check back later!",
          show_alert: true,
        });
        return NextResponse.json({ ok: true });
      }
      if (cbData === "back:list" || cbData.startsWith("list:") || cbData.startsWith("refresh:list:")) {
        const parts = cbData.split(":");
        let pageStr = "1";
        let filterStr = "all";
        let modeStr = "view";

        if (cbData.startsWith("refresh:list:")) {
          pageStr = parts[2] || "1";
          filterStr = parts[3] || "all";
          modeStr = parts[4] || "view";
        } else if (cbData.startsWith("list:")) {
          pageStr = parts[1] || "1";
          filterStr = parts[2] || "all";
          modeStr = parts[3] || "view";
        }

        const filter: "all" | "instock" = filterStr === "instock" ? "instock" : "all";
        const mode: "view" | "edit" = modeStr === "edit" ? "edit" : "view";
        const page = Math.max(1, parseInt(pageStr, 10) || 1);
        let allProducts = await db.select().from(products).orderBy(desc(products.createdAt));

        if (filter === "instock") {
          allProducts = allProducts.filter((p) => (p.stock ?? 0) > 0);
        }

        const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
        const currentPage = Math.min(page, totalPages);
        const pageItems = allProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

        const rendered = renderProductList(pageItems, currentPage, totalPages, filter, mode);
        await bot.api.editMessageText(cbChatId, cbMessageId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
        await bot.api.answerCallbackQuery(cbId, {
          text: cbData.startsWith("refresh:") ? "🔄 Product list refreshed!" : undefined,
        });
        return NextResponse.json({ ok: true });
      }

      // 1.1 help:menu
      if (cbData === "help:menu") {
        const rendered = renderHelpMenu();
        await bot.api.editMessageText(cbChatId, cbMessageId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 1.2 help:add
      if (cbData === "help:add") {
        await bot.api.sendMessage(
          cbChatId,
          `➕ *HOW TO ADD PRODUCT:*\n\n` +
          `Copy & modify this command:\n` +
          `\`/addproduct Claude Max 5X | 500000 | 10 | https://... | 30 days subscription\`\n\n` +
          `*Format:* \`/addproduct <Name> | <PriceVND> | <Stock> | [ImageUrl] | [Description]\``,
          { parse_mode: "Markdown" }
        );
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 1.3 help:orders
      if (cbData === "help:orders") {
        await bot.api.sendMessage(
          cbChatId,
          `💳 *ORDER FULFILLMENT GUIDE:*\n\n` +
          `• \`/send <OrderID> 1\` - Mark complete & auto-deduct item stock\n` +
          `• \`/send <OrderID> 0\` - Reject order\n` +
          `• \`/send <OrderID> 2\` - Ask customer to verify payment proof\n` +
          `• \`/send <OrderID> <Message>\` - Send delivery details / credentials\n\n` +
          `*Example:* \`/send ORD-1234 User: test@gmail.com | Pass: 123456\``,
          { parse_mode: "Markdown" }
        );
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 1.4 help:broadcast
      if (cbData === "help:broadcast") {
        await bot.api.sendMessage(
          cbChatId,
          `📢 *BROADCAST MESSAGE GUIDE:*\n\n` +
          `Send a pop-up notice to all website visitors:\n` +
          `\`/broadcast 🔥 Super sale 20% off all accounts today!\``,
          { parse_mode: "Markdown" }
        );
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 1.5 noop
      if (cbData.includes(":noop")) {
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 2. view:<id> or refresh:view:<id>
      if (cbData.startsWith("view:") || cbData.startsWith("refresh:view:")) {
        const prodId = cbData.startsWith("refresh:view:") ? cbData.split(":")[2] : cbData.split(":")[1];
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
        await bot.api.answerCallbackQuery(cbId, {
          text: cbData.startsWith("refresh:") ? "🔄 Product status refreshed!" : undefined,
        });
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
        const editSyntax = `/editproduct ${p.id} | ${p.name} | ${p.price} | ${p.stock ?? 0} | ${p.imageUrl || ""} | ${p.duration || ""} | ${p.deliveryType || ""} | ${p.warranty || ""}`;
        await bot.api.sendMessage(
          cbChatId,
          `✏️ *To edit product, copy & modify this command:*\n\n\`${editSyntax}\``,
          { parse_mode: "Markdown" }
        );
        await bot.api.answerCallbackQuery(cbId);
        return NextResponse.json({ ok: true });
      }

      // 4.1 input:stock:<id>, input:price:<id>, input:name:<id>, input:duration:<id>, input:type:<id>, input:warranty:<id>, input:image:<id> -> ForceReply prompt
      if (cbData.startsWith("input:")) {
        const [, field, prodId] = cbData.split(":");
        const found = await db.select().from(products).where(eq(products.id, prodId)).limit(1);
        if (found.length === 0) {
          await bot.api.answerCallbackQuery(cbId, { text: "Product not found.", show_alert: true });
          return NextResponse.json({ ok: true });
        }
        const p = found[0];
        const fieldQuestions: Record<string, { prompt: string; example: string; current: string }> = {
          name: {
            prompt: "What new product name would you like to use?",
            example: "e.g. Claude 3.7 Sonnet Max 5X",
            current: p.name,
          },
          price: {
            prompt: "What new price in VND would you like to set?",
            example: "e.g. 150000",
            current: formatDualPrice(p.price),
          },
          stock: {
            prompt: "What new stock quantity would you like to set?",
            example: "e.g. 25",
            current: String(p.stock ?? 0),
          },
          duration: {
            prompt: "What duration would you like to set?",
            example: "e.g. 1 month, 6 months, 1 year",
            current: p.duration || "_None_",
          },
          type: {
            prompt: "What delivery type would you like to set?",
            example: "e.g. Account, Link, Key, Email",
            current: p.deliveryType || "_None_",
          },
          warranty: {
            prompt: "What warranty period would you like to set?",
            example: "e.g. 24H, 7 days, 1 month, Full time",
            current: p.warranty || "_None_",
          },
          image: {
            prompt: "What image URL would you like to set?",
            example: "e.g. https://domain.com/icon.png",
            current: p.imageUrl || "_None_",
          },
        };

        const config = fieldQuestions[field] || {
          prompt: `What new ${field} would you like to set?`,
          example: "",
          current: "_None_",
        };

        await bot.api.sendMessage(
          cbChatId,
          `✏️ *Editing ${field.toUpperCase()} for "${p.name}"*\n` +
            `[ID: \`${p.id}\` | Field: \`${field}\` | Current: *${config.current}*]\n\n` +
            `❓ *${config.prompt}*\n` +
            (config.example ? `_${config.example}_\n\n` : "\n") +
            `👉 *Reply to this message with your new value:*`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              force_reply: true,
              selective: true,
            },
          }
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

    // --- HANDLE TEXT / STICKER / MEDIA MESSAGES ---
    const messageObj = update?.message || update?.channel_post;
    const rawText = (messageObj?.text || messageObj?.caption || "").trim();
    const chatId = String(messageObj?.chat?.id || "").trim();
    const sticker = messageObj?.sticker;

    // Handle sticker sent directly or custom emoji sticker
    if (sticker) {
      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `✨ *STICKER / EMOJI INFO:*\n\n` +
            `• Emoji: ${sticker.emoji || "_none_"}\n` +
            `• Set Name: \`${sticker.set_name || "_none_"}\`\n` +
            `• Custom Emoji ID: \`${sticker.custom_emoji_id || "_none_"}\`\n` +
            `• File ID: \`${sticker.file_id}\`\n\n` +
            (sticker.custom_emoji_id ? `_Copy Custom Emoji ID:_ \`${sticker.custom_emoji_id}\`` : ""),
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (!rawText) {
      return NextResponse.json({ ok: true });
    }

    // Sender authorization check against TELEGRAM_ADMIN_CHAT_ID (supports comma-separated list)
    if (!isAuthorized(chatId)) {
      console.warn("Unauthorized Telegram message from chatId:", chatId, "allowed:", adminChatIds);
      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `⛔ *Access Denied.*\n\n• Your Chat ID: \`${chatId}\`\n• Configured \`TELEGRAM_ADMIN_CHAT_ID\`: \`${adminChatIds.join(", ") || "EMPTY / NOT SET"}\`\n\nAdd your Chat ID to \`TELEGRAM_ADMIN_CHAT_ID\` in Vercel (comma-separated, e.g. \`${adminChatIds.length > 0 ? adminChatIds.join(",") + "," : ""}${chatId}\`) and redeploy.`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 0. Reply-to-message prompt handler (Interactive ForceReply for auth password or product attributes)
    const replyTo = messageObj?.reply_to_message;
    if (replyTo && replyTo.text) {
      const parentText: string = replyTo.text;

      // Handle Admin Password Prompt
      if (parentText.includes("ADMIN AUTHENTICATION") || parentText.includes("Admin Password")) {
        const inputPassword = rawText.trim();
        const expectedPassword = process.env.ADMIN_PASSWORD || "admin";

        if (inputPassword === expectedPassword) {
          const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
          const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
          const pageItems = allProducts.slice(0, PAGE_SIZE);
          const rendered = renderProductList(pageItems, 1, totalPages, "all", "edit");

          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `🔓 *Password Verified! Welcome to Admin Panel.*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
        } else {
          if (bot && chatId) {
            await bot.api.sendMessage(
              chatId,
              `⛔ *Incorrect Password.* Access denied. Use \`/startadmin\` to try again.`,
              { parse_mode: "Markdown" }
            );
          }
        }
        return NextResponse.json({ ok: true });
      }

      const idMatch = parentText.match(/\[ID:\s*`?([a-zA-Z0-9_-]+)`?/i) || parentText.match(/ID:\s*`?([a-zA-Z0-9_-]+)`?/i);
      const fieldMatch = parentText.match(/Field:\s*`?([a-zA-Z0-9_-]+)`?/i);
      const isStockPrompt = fieldMatch ? fieldMatch[1] === "stock" : (parentText.includes("Edit STOCK") || parentText.includes("Stock Number"));
      const isPricePrompt = fieldMatch ? fieldMatch[1] === "price" : (parentText.includes("Edit PRICE") || parentText.includes("Price in VND"));
      const isNamePrompt = fieldMatch ? fieldMatch[1] === "name" : (parentText.includes("Edit NAME") || parentText.includes("Product Name"));
      const isDurationPrompt = fieldMatch ? fieldMatch[1] === "duration" : parentText.includes("Edit DURATION");
      const isTypePrompt = fieldMatch ? fieldMatch[1] === "type" : parentText.includes("Edit TYPE");
      const isWarrantyPrompt = fieldMatch ? fieldMatch[1] === "warranty" : parentText.includes("Edit WARRANTY");
      const isImagePrompt = fieldMatch ? fieldMatch[1] === "image" : parentText.includes("Edit IMAGE");

      if (idMatch && (isStockPrompt || isPricePrompt || isNamePrompt || isDurationPrompt || isTypePrompt || isWarrantyPrompt || isImagePrompt)) {
        const prodId = idMatch[1];
        const found = await db.select().from(products).where(eq(products.id, prodId)).limit(1);

        if (found.length === 0) {
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `⚠️ Product \`${prodId}\` not found.`, { parse_mode: "Markdown" });
          }
          return NextResponse.json({ ok: true });
        }

        const p = found[0];

        if (isNamePrompt) {
          const newName = rawText.trim();
          if (!newName) {
            if (bot && chatId) {
              await bot.api.sendMessage(chatId, `⚠️ Name cannot be empty.`, { parse_mode: "Markdown" });
            }
            return NextResponse.json({ ok: true });
          }
          await db.update(products).set({ name: newName }).where(eq(products.id, prodId));
          const updated = { ...p, name: newName };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Product Renamed to "${newName}"!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }

        if (isPricePrompt) {
          const newPrice = Number(rawText.trim().replace(/[^0-9.]/g, ""));
          if (isNaN(newPrice) || newPrice < 0) {
            if (bot && chatId) {
              await bot.api.sendMessage(chatId, `⚠️ Please enter a valid number for price (e.g. \`120000\`).`, { parse_mode: "Markdown" });
            }
            return NextResponse.json({ ok: true });
          }
          await db.update(products).set({ price: newPrice }).where(eq(products.id, prodId));
          const updated = { ...p, price: newPrice };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Price Updated to ${formatDualPrice(newPrice)}!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }

        if (isStockPrompt) {
          const newStock = parseInt(rawText.trim(), 10);
          if (isNaN(newStock) || newStock < 0) {
            if (bot && chatId) {
              await bot.api.sendMessage(chatId, `⚠️ Please enter a valid non-negative number for stock (e.g. \`15\`).`, { parse_mode: "Markdown" });
            }
            return NextResponse.json({ ok: true });
          }
          await db.update(products).set({ stock: newStock }).where(eq(products.id, prodId));
          const updated = { ...p, stock: newStock };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Stock Updated to ${newStock}!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }

        if (isDurationPrompt) {
          const newDuration = rawText.trim();
          await db.update(products).set({ duration: newDuration }).where(eq(products.id, prodId));
          const updated = { ...p, duration: newDuration };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Duration Updated to "${newDuration || 'None'}"!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }

        if (isTypePrompt) {
          const newType = rawText.trim();
          await db.update(products).set({ deliveryType: newType }).where(eq(products.id, prodId));
          const updated = { ...p, deliveryType: newType };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Delivery Type Updated to "${newType || 'None'}"!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }

        if (isWarrantyPrompt) {
          const newWarranty = rawText.trim();
          await db.update(products).set({ warranty: newWarranty }).where(eq(products.id, prodId));
          const updated = { ...p, warranty: newWarranty };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Warranty Updated to "${newWarranty || 'None'}"!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }

        if (isImagePrompt) {
          const newImage = rawText.trim();
          await db.update(products).set({ imageUrl: newImage }).where(eq(products.id, prodId));
          const updated = { ...p, imageUrl: newImage };
          const rendered = renderProductDetail(updated);
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `✅ *Image URL Updated!*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
          return NextResponse.json({ ok: true });
        }
      }
    }

    const firstWord = rawText.split(/\s+/)[0];
    const command = firstWord.split("@")[0].toLowerCase();
    const restText = rawText.substring(firstWord.length).trim();

    // 0. Catch-all Custom Emoji inspection helper (works on ANY message containing custom emojis)
    const customEmojiEntities = (messageObj?.entities || []).filter(
      (e: { type: string; custom_emoji_id?: string }) => e.type === "custom_emoji" && e.custom_emoji_id
    );

    if (customEmojiEntities.length > 0) {
      const results = customEmojiEntities.map(
        (e: { offset: number; length: number; custom_emoji_id?: string }) => {
          const char = rawText.substring(e.offset, e.offset + e.length);
          return `• ${char} ➔ \`${e.custom_emoji_id}\``;
        }
      );

      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `✨ *DETECTED CUSTOM EMOJI IDs:*\n\n${results.join("\n")}\n\n_Copy and paste these IDs into the chat so I can put your custom brand logos in the bot!_`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (command === "/emoji") {
      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `ℹ️ *How to extract Custom Emoji IDs:*\n\nSend a message containing any custom emoji from your sticker pack (e.g. \`xA1pack\`).\nThe bot will automatically detect and reply with their exact \`custom_emoji_id\` numbers.`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 1. /start handler (Customer Storefront Catalog to Buy)
    if (command === "/start") {
      const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
      const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
      const pageItems = allProducts.slice(0, PAGE_SIZE);

      if (bot && chatId) {
        const rendered = renderCustomerProductList(pageItems, 1, totalPages);
        await bot.api.sendMessage(chatId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
      }
      return NextResponse.json({ ok: true });
    }

    // 1.1 /startadmin handler (Requests ADMIN_PASSWORD for verification)
    if (command === "/startadmin") {
      const inlinePass = restText.trim();
      const expectedPassword = process.env.ADMIN_PASSWORD || "admin";

      // If user provided password inline: `/startadmin <password>`
      if (inlinePass) {
        if (inlinePass === expectedPassword) {
          const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
          const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
          const pageItems = allProducts.slice(0, PAGE_SIZE);
          const rendered = renderProductList(pageItems, 1, totalPages, "all", "edit");

          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `🔓 *Password Verified! Welcome to Admin Panel.*`, { parse_mode: "Markdown" });
            await bot.api.sendMessage(chatId, rendered.text, {
              parse_mode: "Markdown",
              reply_markup: rendered.reply_markup,
            });
          }
        } else {
          if (bot && chatId) {
            await bot.api.sendMessage(chatId, `⛔ *Incorrect Password.* Access denied.`, { parse_mode: "Markdown" });
          }
        }
        return NextResponse.json({ ok: true });
      }

      // If no password provided, prompt via ForceReply
      if (bot && chatId) {
        await bot.api.sendMessage(
          chatId,
          `🔐 *ADMIN AUTHENTICATION REQUIRED*\n\n` +
            `👉 *Reply to this message with your Admin Password:*`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              force_reply: true,
              selective: true,
            },
          }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 1.2 /help
    if (command === "/help") {
      if (bot && chatId) {
        const rendered = renderHelpMenu();
        await bot.api.sendMessage(chatId, rendered.text, {
          parse_mode: "Markdown",
          reply_markup: rendered.reply_markup,
        });
      }
      return NextResponse.json({ ok: true });
    }

    // 2. /products or /list
    if (command === "/products" || command === "/list") {
      const filter: "all" | "instock" = restText.toLowerCase() === "instock" ? "instock" : "all";
      let allProducts = await db.select().from(products).orderBy(desc(products.createdAt));

      if (filter === "instock") {
        allProducts = allProducts.filter((p) => (p.stock ?? 0) > 0);
      }

      const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
      const pageItems = allProducts.slice(0, PAGE_SIZE);

      const rendered = renderProductList(pageItems, 1, totalPages, filter);
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

    // 5. /addproduct <name> | <price> | <stock> | [imageUrl] | [duration] | [type] | [warranty]
    if (command === "/addproduct") {
      const parts = restText.split("|").map((p: string) => p.trim());
      const name = parts[0];
      const priceStr = parts[1];
      const stockStr = parts[2];
      const imageUrl = parts[3] || "";
      const duration = parts[4] || "";
      const deliveryType = parts[5] || "";
      const warranty = parts[6] || "";

      const price = Number(priceStr);
      if (!name || isNaN(price) || price < 0) {
        if (bot && chatId) {
          await bot.api.sendMessage(
            chatId,
            `ℹ️ *Usage:* \`/addproduct <name> | <price> | <stock> | [imageUrl] | [duration] | [type] | [warranty]\`\n\n` +
              `*Example:* \`/addproduct Netflix 1 Month | 70000 | 20 | https://img.com/pic.png | 1 month | Account | Warranty 30 days\``,
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
        duration,
        deliveryType,
        warranty,
        price,
        stock,
        imageUrl,
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
            `*Duration:* ${duration || "_None_"}\n` +
            `*Type:* ${deliveryType || "_None_"}\n` +
            `*Warranty:* ${warranty || "_None_"}\n` +
            `*Image:* ${imageUrl || "_None_"}`,
          { parse_mode: "Markdown" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 6. /editproduct [id] | [name] | [price] | [stock] | [imageUrl] | [duration] | [type] | [warranty]
    if (command === "/editproduct") {
      const parts = restText.split("|").map((p: string) => p.trim());
      const prodId = parts[0];
      const name = parts[1];
      const priceStr = parts[2];
      const stockStr = parts[3];
      const imageUrl = parts[4];
      const duration = parts[5];
      const deliveryType = parts[6];
      const warranty = parts[7];

      // If no args provided, show product list for user to choose
      if (!prodId) {
        if (bot && chatId) {
          const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
          const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
          const pageItems = allProducts.slice(0, PAGE_SIZE);
          const rendered = renderProductList(pageItems, 1, totalPages, "all", "edit");
          await bot.api.sendMessage(chatId, rendered.text, {
            parse_mode: "Markdown",
            reply_markup: rendered.reply_markup,
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

      const existing = matching[0];
      const newName = name !== undefined && name !== "" ? name : existing.name;
      const newPrice = priceStr !== undefined && !isNaN(Number(priceStr)) ? Number(priceStr) : existing.price;
      const newStock =
        stockStr !== undefined && !isNaN(Number(stockStr))
          ? Math.max(0, parseInt(stockStr, 10))
          : (existing.stock ?? 0);
      const newImageUrl = imageUrl !== undefined ? imageUrl : existing.imageUrl;
      const newDuration = duration !== undefined ? duration : existing.duration;
      const newDeliveryType = deliveryType !== undefined ? deliveryType : existing.deliveryType;
      const newWarranty = warranty !== undefined ? warranty : existing.warranty;

      await db
        .update(products)
        .set({
          name: newName,
          duration: newDuration,
          deliveryType: newDeliveryType,
          warranty: newWarranty,
          price: newPrice,
          stock: newStock,
          imageUrl: newImageUrl,
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
            `*Duration:* ${newDuration || "_None_"}\n` +
            `*Type:* ${newDeliveryType || "_None_"}\n` +
            `*Warranty:* ${newWarranty || "_None_"}\n` +
            `*Image:* ${newImageUrl || "_None_"}`,
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
