import { TelegramIntegration } from "../../shared/models";
import { redis } from "../../shared/config/redis";
import { logger } from "../../shared/utils/logger";
import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { getUserEmails } from "../../apis/utils/email-helper";
import { Context } from "grammy";
import crypto from "crypto";
import {
  UnifiedEmailDocument,
  SavedSearchFilters,
} from "../../shared/services/elastic/interface";

interface UIEmailItem {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export class TelegramService {
  private readonly CACHE_TTL: number = 7200;
  private elasticService: ElasticsearchService = new ElasticsearchService(
    elasticClient,
  );

  public async handleUnread(ctx: Context): Promise<void> {
    const userId = await this.requireUserId(ctx);
    if (!userId) return;

    await ctx.replyWithChatAction("typing");
    try {
      const emails = await this.executeEmailSearch(userId, { isRead: false });
      await this.renderEmailGrid(ctx, emails, "📬 <b>Recent Unread Emails</b>");
    } catch (error) {
      this.logAndReplyError(ctx, "Unread", error);
    }
  }

  public async handleSummary(ctx: Context): Promise<void> {
    const userId = await this.requireUserId(ctx);
    if (!userId) return;

    await ctx.replyWithChatAction("typing");
    try {
      const today = new Date().toISOString().split("T")[0];
      const emails = await this.executeEmailSearch(userId, { dateFrom: today });
      await this.renderEmailGrid(
        ctx,
        emails,
        "🗓️ <b>Today's Inbox Activity</b>",
      );
    } catch (error) {
      this.logAndReplyError(ctx, "Summary", error);
    }
  }

  public async handleSearchPrompt(ctx: Context): Promise<void> {
    await ctx.reply(
      "🔎 <b>Search Mode</b>\nType keywords, a sender's email, or use <code>/search query</code>.",
      { parse_mode: "HTML" },
    );
  }

  public async sendSettings(ctx: Context): Promise<void> {
    await ctx.reply(
      "⚙️ <b>BetterMail Settings</b>\nManage your connected accounts and notifications.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔗 Manage Accounts",
                url: "https://bettermail.tech/settings",
              },
            ],
            [{ text: "🔕 Mute Alerts", callback_data: "mute_alerts" }],
          ],
        },
      },
    );
  }

  private async executeEmailSearch(
    userId: string,
    filters: SavedSearchFilters,
  ): Promise<UIEmailItem[]> {
    const { emails: emailAddresses, error } = await getUserEmails(userId);
    if (error || !emailAddresses?.length)
      throw new Error("No linked accounts.");

    const result = await this.elasticService.searchEmails({
      emailAddresses,
      query: "",
      size: 5,
      filters,
    });

    return Promise.all(
      result.emails.map(async (e: UnifiedEmailDocument) => {
        const shortId = crypto.randomBytes(4).toString("hex");
        await redis.set(`tg:btn:${shortId}`, e.threadId, "EX", 7200);

        return {
          id: shortId,
          subject: this.escapeHtml(e.subject || "(No Subject)"),
          from: this.escapeHtml(e.from?.name || e.from?.email || "Unknown"),
          snippet: this.escapeHtml(e.snippet || ""),
          date: new Date(e.receivedAt).toLocaleDateString(),
        };
      }),
    );
  }

  private async renderEmailGrid(
    ctx: Context,
    emails: UIEmailItem[],
    title: string,
  ): Promise<void> {
    if (emails.length === 0) {
      await ctx.reply(`${title}\n\nYour inbox is currently clear! ✨`, {
        parse_mode: "HTML",
      });
      return;
    }

    const content = emails
      .map(
        (e, i) =>
          `${i + 1}. <b>${e.subject}</b>\n👤 ${e.from}\n<i>${e.snippet.slice(0, 60)}...</i>`,
      )
      .join("\n\n<code>────────────────</code>\n\n");

    const inline_keyboard = emails.map((e, i) => [
      { text: `🧵 View Thread #${i + 1}`, callback_data: `view:${e.id}` },
      { text: "📦 Archive", callback_data: `archive:${e.id}` },
      { text: "🗑️ Trash", callback_data: `trash:${e.id}` },
    ]);

    await ctx.reply(`${title}\n\n${content}`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
  }

  public async handleCallback(ctx: Context): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [action, shortId] = data.split(":");
    await ctx.answerCallbackQuery();

    const threadId = await redis.get(`tg:btn:${shortId}`);
    if (!threadId) return void ctx.reply("⚠️ Session expired.");

    if (action === "view") {
      await this.handleViewFullThread(ctx, threadId);
    }
  }

  private async handleViewFullThread(
    ctx: Context,
    threadId: string,
  ): Promise<void> {
    const userId = await this.requireUserId(ctx);
    if (!userId) return;

    await ctx.replyWithChatAction("typing");
    try {
      const { emails: emailAddresses } = await getUserEmails(userId);
      const { emails } = await this.elasticService.getEmailsByThreadId({
        threadId,
        emailAddresses: emailAddresses || [],
      });

      if (!emails || emails.length === 0) {
        return void ctx.reply("❌ Thread not found or access denied.");
      }

      const mainSubject = this.escapeHtml(emails[0].subject || "(No Subject)");

      const threadBody = emails
        .sort(
          (a, b) =>
            new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
        )
        .map((email) => {
          const from = this.escapeHtml(email.from.name || email.from.email);
          const to = this.escapeHtml(
            email.to?.map((t) => t.email).join(", ") || "Unknown",
          );
          const date = new Date(email.receivedAt).toLocaleString();
          const content = this.escapeHtml(
            email.bodyText || email.snippet || "No content.",
          );

          return (
            `👤 <b>From:</b> ${from}\n` +
            `📥 <b>To:</b> ${to}\n` +
            `📅 <b>Date:</b> ${date}\n` +
            `🆔 <code>${email.id.slice(0, 12)}...</code>\n\n` +
            `${content}`
          );
        })
        .join("\n\n<code>━━━━━ (Reply) ━━━━━</code>\n\n");

      const header =
        `🧵 <b>THREAD: ${mainSubject}</b>\n` +
        `📂 <b>ThreadID:</b> <code>${threadId.slice(0, 12)}...</code>\n` +
        `────────────────\n\n`;

      await ctx.reply((header + threadBody).slice(0, 4000), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✉️ Reply All", callback_data: `reply_all:${threadId}` },
              {
                text: "📥 Archive Thread",
                callback_data: `archive:${threadId}`,
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logAndReplyError(ctx, "Thread", error);
    }
  }

  private async requireUserId(ctx: Context): Promise<string | null> {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return null;
    const userId = await this.getUserIdByChatId(chatId);
    if (!userId) {
      await ctx.reply("Please link your account first using /start");
      return null;
    }
    return userId;
  }

  private logAndReplyError(ctx: Context, context: string, error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[TG ${context}]: ${msg}`);
    ctx.reply(`❌ Error fetching ${context.toLowerCase()}.`);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  public async getUserIdByChatId(chatId: string): Promise<string | null> {
    const cacheKey = `tg:user_id_by_chat:${chatId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const tgRecord = await TelegramIntegration.findOne({
      where: { chat_id: chatId },
    });
    if (tgRecord?.user_id) {
      await redis.set(cacheKey, tgRecord.user_id, "EX", this.CACHE_TTL);
      return tgRecord.user_id;
    }
    return null;
  }
}
