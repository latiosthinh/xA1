import { Bot } from "grammy";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

export const bot = botToken && !botToken.includes("FakeToken") ? new Bot(botToken) : null;

export async function sendTelegramOrderAlert(order: {
  id: string;
  publicMemo: string;
  totalAmount: number;
  paymentMethod: string;
  itemsJson: string;
}) {
  if (!bot || !adminChatId) {
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
            `• ${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`
        )
        .join("\n");
    } catch {
      itemsList = "• Order Items";
    }

    const message = `🚨 *NEW PAYMENT RECEIVED*\n\n` +
      `*Order ID / Memo:* \`${order.publicMemo}\`\n` +
      `*Method:* ${order.paymentMethod.toUpperCase()}\n` +
      `*Total:* $${order.totalAmount.toFixed(2)}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `💬 *To reply to customer, send:*\n` +
      `\`/reply ${order.publicMemo} <Your message / account info>\``;

    await bot.api.sendMessage(adminChatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Failed to send Telegram alert:", error);
  }
}
