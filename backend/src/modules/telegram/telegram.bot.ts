import { telegramBot } from "../../shared/config/telegram";
import { TelegramService } from "./telegram.service";

const telegramService = new TelegramService();

export const setupTelegramBot = () => {
  telegramBot.api.setMyCommands([
    { command: "start", description: "🚀 Open main menu" },
    { command: "search", description: "🔍 Search your emails" },
    { command: "unread", description: "📩 View unread emails" },
    { command: "summary", description: "🗓️ Get today's summary" },
  ]);
  telegramBot.command("start", async (ctx) => {
    await telegramService.handleStart(ctx);
  });

  telegramBot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;
    await telegramService.handleIncomingMessage(ctx);
  });
};
