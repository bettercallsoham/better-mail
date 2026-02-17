import { Bot } from "grammy";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

export const telegramBot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
