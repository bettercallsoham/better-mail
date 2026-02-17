import { telegramBot } from "../../shared/config/telegram";
import { Integration, TelegramIntegration } from "../../shared/models";
import { IntegrationProvider, IntegrationStatus } from "../../shared/models";
import { redis } from "../../shared/config/redis";
import { logger } from "../../shared/utils/logger";

export class TelegramService {
  private readonly CHAT_ID_CACHE_TTL = 7200; // 2 hours

  /**
   * Send a message to the user via Telegram.
   * Switched to HTML parse mode for better stability with AI-generated content.
   */
  async sendMessage(userId: string, text: string) {
    const cacheKey = `tg:chat_id:${userId}`;
    let chatId = await redis.get(cacheKey);

    if (!chatId) {
      const integration = await Integration.findOne({
        where: {
          user_id: userId,
          provider: IntegrationProvider.TELEGRAM,
          status: IntegrationStatus.ACTIVE,
        },
        include: [{ model: TelegramIntegration, as: "telegram" }],
      });

      if (!integration || !integration.telegram) return;

      chatId = integration.telegram.chat_id;
      await redis.set(cacheKey, chatId, "EX", this.CHAT_ID_CACHE_TTL);
    }

    try {
      // Using HTML mode prevents "Bad Request: can't parse entities" for characters like ( . ! )
      await telegramBot.api.sendMessage(String(chatId), text, {
        parse_mode: "HTML",
      });
    } catch (error: any) {
      logger.error(`Failed to send Telegram message to user ${userId}: ${error.message}`);
      
      // Fallback: if HTML tags are broken, send as plain text
      if (error.description?.includes("can't parse entities")) {
        await telegramBot.api.sendMessage(String(chatId), text);
      }
    }
  }

  /**
   * Handle the /start flow with a cleaner, product-first tone.
   */
  async handleStart(ctx: any) {
    const token = ctx.match;
    const chatId = ctx.chat?.id;

    if (!chatId) return;

    // 1. Unauthenticated / New User
    if (!token) {
      const welcomeMsg = 
        `<b>BetterMail</b> 📬\n\n` +
        `Your inbox, but smarter. Connect to get real-time alerts and manage emails via chat.\n\n` +
        `➡️ <b>To link your account:</b>\n` +
        `1. Open <a href="https://bettermail.tech">BetterMail</a>\n` +
        `2. Go to <b>Settings</b> —> <b>Integrations</b>\n` +
        `3. Select <b>Connect Telegram</b>\n\n` +
        `<i>Waiting for connection...</i>`;

      return await ctx.reply(welcomeMsg, { 
        parse_mode: "HTML", 
        disable_web_page_preview: true 
      });
    }

    const redisKey = `integration:telegram:link:${token}`;
    const userId = await redis.get(redisKey);

    if (!userId) {
      return await ctx.reply(
        `⚠️ <b>Link Expired</b>\n\nPlease generate a new connection link from your BetterMail settings.`,
        { parse_mode: "HTML" }
      );
    }

    await redis.del(redisKey);

    // 2. Integration Logic
    let [integration] = await Integration.findOrCreate({
      where: { user_id: userId, provider: IntegrationProvider.TELEGRAM },
      defaults: {
        user_id: userId,
        provider: IntegrationProvider.TELEGRAM,
        status: IntegrationStatus.ACTIVE,
      },
    });

    if (integration.status !== IntegrationStatus.ACTIVE) {
      await integration.update({ status: IntegrationStatus.ACTIVE });
    }

    // 3. Profile Data
    let photoUrl = null;
    try {
      const photos = await ctx.api.getUserProfilePhotos(ctx.from.id, { limit: 1 });
      if (photos.total_count > 0) {
        const file = await ctx.api.getFile(photos.photos[0][0].file_id);
        photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      }
    } catch (err) {
      logger.error("Could not fetch TG profile data: " + err);
    }

    await TelegramIntegration.upsert({
      integration_id: integration.id,
      chat_id: String(chatId),
      username: ctx.from?.username || null,
      first_name: ctx.from?.first_name || null,
      last_name: ctx.from?.last_name || null,
      photo_url: photoUrl,
    });

    // Seed the cache immediately
    await redis.set(`tg:chat_id:${userId}`, String(chatId), "EX", this.CHAT_ID_CACHE_TTL);

    await ctx.reply(
      `✅ <b>Account Linked</b>\n\nYou're all set. BetterMail will now send important updates here.`,
      { parse_mode: "HTML" }
    );
  }

  async disconnect(userId: string) {
    const integration = await Integration.findOne({
      where: { user_id: userId, provider: IntegrationProvider.TELEGRAM },
    });

    if (integration) {
      await integration.update({ status: IntegrationStatus.REVOKED });
      await redis.del(`tg:chat_id:${userId}`);
    }
  }
}