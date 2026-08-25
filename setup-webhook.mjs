import { Bot } from "grammy";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

async function checkWebhook() {
  if (!botToken || botToken.includes("FakeToken")) {
    console.error("Missing valid TELEGRAM_BOT_TOKEN in .env");
    process.exit(1);
  }

  const bot = new Bot(botToken);
  const info = await bot.api.getWebhookInfo();
  console.log("Current Telegram Webhook Info:", JSON.stringify(info, null, 2));

  if (process.argv.includes("--set")) {
    if (!webhookUrl) {
      console.error("TELEGRAM_WEBHOOK_URL not set in .env");
      process.exit(1);
    }
    const fullUrl = webhookUrl.endsWith("/api/telegram/webhook")
      ? webhookUrl
      : `${webhookUrl.replace(/\/$/, "")}/api/telegram/webhook`;

    console.log(`Registering webhook URL: ${fullUrl}`);
    await bot.api.setWebhook(fullUrl, {
      secret_token: secret || undefined,
    });
    const updated = await bot.api.getWebhookInfo();
    console.log("Updated Webhook Info:", JSON.stringify(updated, null, 2));
  }
}

checkWebhook().catch((err) => {
  console.error("Webhook check error:", err);
  process.exit(1);
});
