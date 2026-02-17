import { telegramBot } from "../../shared/config/telegram";
import { Integration, TelegramIntegration } from "../../shared/models";
import { IntegrationProvider, IntegrationStatus } from "../../shared/models";
import { redis } from "../../shared/config/redis";

export class TelegramService {
  /**
   * Send message to user via Telegram
   */
  async sendMessage(userId: string, text: string) {
    const integration = await Integration.findOne({
      where: {
        user_id: userId,
        provider: IntegrationProvider.TELEGRAM,
        status: IntegrationStatus.ACTIVE,
      },
      include: [{ model: TelegramIntegration, as: "telegram" }],
    });

    if (!integration || !integration.telegram) return;

    const chatId = integration.telegram.chat_id;

    await telegramBot.api.sendMessage(String(chatId), text);
  }

  /**
   * Handle /start <token> linking
   */
  async handleStart(ctx: any) {
    const token = ctx.match;
    const chatId = ctx.chat?.id;

    if (!chatId) {
      ctx.reply("No chat id , sucker");
    }

    // 👇 No token provided
    if (!token) {
      await ctx.reply(
        "👋 Welcome to BetterMail!\n\n" +
          "To connect your Telegram account:\n\n" +
          "1️⃣ Open BetterMail\n" +
          "2️⃣ Go to Settings → Integrations\n" +
          "3️⃣ Click 'Connect Telegram'\n\n" +
          "We'll automatically link your account.",
      );
      return;
    }

    const userId = await redis.get(`integration:telegram:link:${token}`);

    // 👇 Invalid or expired token
    if (!userId) {
      await ctx.reply(
        "⚠️ This connection link is invalid or has expired.\n\n" +
          "Please return to BetterMail and generate a new Telegram connection link.",
      );
      return;
    }

    // One-time use
    await redis.del(`integration:telegram:link:${token}`);

    let integration = await Integration.findOne({
      where: {
        user_id: userId,
        provider: IntegrationProvider.TELEGRAM,
      },
    });

    if (!integration) {
      integration = await Integration.create({
        user_id: userId,
        provider: IntegrationProvider.TELEGRAM,
        status: IntegrationStatus.ACTIVE,
      });
    } else {
      await integration.update({ status: IntegrationStatus.ACTIVE });
    }

    await TelegramIntegration.upsert({
      integration_id: integration.id,
      chat_id: String(chatId), // Always store as string
      username: ctx.from?.username || null,
      first_name: ctx.from?.first_name || null,
    });

    await ctx.reply(
      "✅ Telegram successfully connected!\n\n" +
        "You'll now receive important updates and can interact with BetterMail directly from here.",
    );
  }

  /**
   * Disconnect telegram
   */
  async disconnect(userId: string) {
    const integration = await Integration.findOne({
      where: {
        user_id: userId,
        provider: IntegrationProvider.TELEGRAM,
      },
    });

    if (!integration) return;

    await integration.update({ status: IntegrationStatus.REVOKED });
  }
}
