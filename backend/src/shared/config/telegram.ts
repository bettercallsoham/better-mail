import { Bot } from "grammy";
import "dotenv/config";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

export const telegramBot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

telegramBot.catch((err) => {
  console.error("telegramBot error:", err);
});
