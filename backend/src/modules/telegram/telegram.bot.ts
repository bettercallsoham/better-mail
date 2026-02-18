import { telegramBot } from "../../shared/config/telegram";
import { TelegramHandler } from "./telegram.handler";
import { TelegramService } from "./telegram.service";

const telegramService = new TelegramService();
const telegramHandler = new TelegramHandler();

export const setupTelegramBot = () => {
  telegramBot.api.setMyCommands([
    { command: "start", description: "🚀 Open main menu" },
    { command: "search", description: "🔍 Search your emails" },
    { command: "unread", description: "📩 View unread emails" },
    { command: "summary", description: "🗓️ Get today's summary" },
  ]);

  telegramBot.command("start", (ctx) => telegramHandler.handleStart(ctx));

  telegramBot.command("unread", (ctx) => telegramService.handleUnread(ctx));
  telegramBot.command("summary", (ctx) => telegramService.handleSummary(ctx));

  telegramBot.hears("📩 Unread", (ctx) => telegramService.handleUnread(ctx));
  telegramBot.hears("🗓️ Today's Summary", (ctx) =>
    telegramService.handleSummary(ctx),
  );
  telegramBot.hears("⚙️ Settings", (ctx) => telegramService.sendSettings(ctx));

  telegramBot.on("message:text", (ctx) =>
    telegramHandler.handleIncomingMessage(ctx),
  );

  telegramBot.on("callback_query:data", (ctx) =>
    telegramService.handleCallback(ctx),
  );
};
