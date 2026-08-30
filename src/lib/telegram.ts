import { Bot } from "grammy";
import { formatDualPrice, formatVND, formatUSD } from "./currency";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const rawAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
const adminChatIds = rawAdminChatId
  .split(",")
  .map((id) => id.trim().replace(/^["']|["']$/g, ""))
  .filter(Boolean);

export const bot = botToken && !botToken.includes("FakeToken") ? new Bot(botToken) : null;

export async function sendTelegramOrderAlert(order: {
  id: string;
  publicMemo: string;
  totalAmount: number;
  paymentMethod: string;
  itemsJson: string;
}) {
  if (!bot || adminChatIds.length === 0) {
    console.log("[Telegram Mock Alert] Order notification:", order.publicMemo);
    return;
  }

  try {
    let itemsList = "";
    try {
      const parsedItems = JSON.parse(order.itemsJson);
      itemsList = parsedItems
        .map(
          (item: { name: string; quantity: number; price: number }) =>
            `• ${item.name} x${item.quantity} (${formatDualPrice(item.price * item.quantity)})`
        )
        .join("\n");
    } catch {
      itemsList = "• Order Items";
    }

    const message = `🚨 *NEW PAYMENT RECEIVED*\n\n` +
      `*Order ID / Memo:* \`${order.publicMemo}\`\n` +
      `*Method:* ${order.paymentMethod.toUpperCase()}\n` +
      `*Total:* ${formatDualPrice(order.totalAmount)}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `💬 *To reply directly to customer:*\n` +
      `\`/send ${order.publicMemo} <Credentials / Message>\`\n\n` +
      `📢 *To broadcast globally to all visitors:*\n` +
      `\`/send <Announcement Message>\``;

    await Promise.all(
      adminChatIds.map((chatId) =>
        bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" }).catch((err) =>
          console.error("Failed to send Telegram alert to:", chatId, err)
        )
      )
    );
  } catch (error) {
    console.error("Failed to send Telegram alert:", error);
  }
}
