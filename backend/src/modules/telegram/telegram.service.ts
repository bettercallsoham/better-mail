import { telegramBot } from "../../shared/config/telegram";
import { Integration, TelegramIntegration } from "../../shared/models";
import { IntegrationProvider, IntegrationStatus } from "../../shared/models";
import { redis } from "../../shared/config/redis";
import { logger } from "../../shared/utils/logger";
import { conversationQueue } from "../../shared/queues/conversation.queue";

export class TelegramService {
  private readonly CACHE_TTL = 7200; // 2 hours

  private escape(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async sendMessage(userId: string, text: string) {
    console.log("Recieved final Text", text);
    const cacheKey = `tg:chat_id:${userId}`;
    let chatId = await redis.get(cacheKey);

    if (!chatId) {
      const tgRecord = await TelegramIntegration.findOne({
        where: { user_id: userId },
      });
      if (!tgRecord) return;
      chatId = tgRecord.chat_id;
      await redis.set(cacheKey, chatId, "EX", this.CACHE_TTL);
    }

    try {
      await telegramBot.api.sendMessage(String(chatId), this.escape(text), {
        parse_mode: "HTML",
      });
    } catch (error: any) {
      logger.error(`[TG Send Error] User ${userId}: ${error.message}`);
      // Fallback for extreme cases
      if (error.description?.includes("can't parse entities")) {
        await telegramBot.api.sendMessage(String(chatId), text);
      }
    }
  }

  async streamToTelegram(
    chatId: string,
    text: string,
    messageId: number | null,
    isFinal = false,
  ): Promise<number | null> {
    const safeText = this.escape(text);
    try {
      if (!messageId) {
        const sent = await telegramBot.api.sendMessage(
          chatId,
          safeText || "...",
          { parse_mode: "HTML" },
        );
        return sent.message_id;
      }
      if (text.trim().length > 0) {
        await telegramBot.api.editMessageText(chatId, messageId, safeText, {
          parse_mode: "HTML",
        });
      }
      return messageId;
    } catch (error: any) {
      if (error.description?.includes("message is not modified"))
        return messageId;
      logger.error(`[TG Stream Error]: ${error.message}`);
      return messageId;
    }
  }

  async sendActionRequired(
    chatId: string,
    description: string,
    conversationId: string,
  ) {
    await telegramBot.api.sendMessage(
      chatId,
      `✋ <b>Action Required</b>\n\n${this.escape(description)}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Approve",
                callback_data: `approve:${conversationId}`,
              },
              { text: "❌ Reject", callback_data: `reject:${conversationId}` },
            ],
          ],
        },
      },
    );
  }

  async handleIncomingMessage(ctx: any) {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text;

    const userId = await this.getUserIdByChatId(chatId);
    if (!userId) {
      return ctx.reply("Please link your account first using /start");
    }

    const conversationId = `tg_${chatId}`;

    await conversationQueue.add("process-message", {
      conversationId,
      userId,
      messageId: `tg_${ctx.message.message_id}`,
      messageContent: text,
    });

    await ctx.replyWithChatAction("typing");
  }

  async handleStart(ctx: any) {
    const token = ctx.match;
    const chatId = String(ctx.chat?.id);

    if (!chatId) return;

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
        disable_web_page_preview: true,
      });
    }

    const redisKey = `integration:telegram:link:${token}`;
    const userId = await redis.get(redisKey);

    if (!userId) {
      return await ctx.reply(
        `⚠️ <b>Link Expired</b>\n\nPlease generate a new connection link in Settings.`,
        { parse_mode: "HTML" },
      );
    }

    await redis.del(redisKey);

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

    let photoUrl = null;
    try {
      const photos = await ctx.api.getUserProfilePhotos(ctx.from.id, {
        limit: 1,
      });
      if (photos.total_count > 0) {
        const file = await ctx.api.getFile(photos.photos[0][0].file_id);
        photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      }
    } catch (err) {
      logger.error("TG Profile Data Error: " + err);
    }

    await TelegramIntegration.upsert({
      integration_id: integration.id,
      user_id: userId,
      chat_id: chatId,
      username: ctx.from?.username || null,
      first_name: ctx.from?.first_name || null,
      last_name: ctx.from?.last_name || null,
      photo_url: photoUrl,
    });

    await Promise.all([
      redis.set(`tg:chat_id:${userId}`, chatId, "EX", this.CACHE_TTL),
      redis.set(`tg:user_id_by_chat:${chatId}`, userId, "EX", this.CACHE_TTL),
    ]);

    await ctx.reply(
      `✅ <b>Account Linked</b>\n\nYou're all set! I can now help you manage your emails here.`,
      { parse_mode: "HTML" },
    );
  }

  private async getUserIdByChatId(chatId: string): Promise<string | null> {
    const cacheKey = `tg:user_id_by_chat:${chatId}`;

    const cachedUserId = await redis.get(cacheKey);
    if (cachedUserId) return cachedUserId;

    const tgRecord = await TelegramIntegration.findOne({
      where: { chat_id: String(chatId) },
      attributes: ["user_id"],
    });

    const userId = tgRecord?.user_id || null;

    if (userId) {
      await redis.set(cacheKey, userId, "EX", this.CACHE_TTL);
    }

    return userId;
  }

  async disconnect(userId: string) {
    const integration = await Integration.findOne({
      where: { user_id: userId, provider: IntegrationProvider.TELEGRAM },
    });

    if (integration) {
      await integration.update({ status: IntegrationStatus.REVOKED });
      await Promise.all([redis.del(`tg:chat_id:${userId}`)]);
    }
  }
}
