import { TelegramIntegration } from "../../shared/models";
import { redis } from "../../shared/config/redis";
import { logger } from "../../shared/utils/logger";
import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { GmailApiService } from "../../shared/services/gmail/gmail-api.service";
import { OutlookApiService } from "../../shared/services/outlook/outlook-api.service";
import { getUserEmails } from "../../apis/utils/email-helper";
import { Context } from "grammy";
import crypto from "crypto";
import { SavedSearchFilters } from "../../shared/services/elastic/interface";
import sanitizeHtml from "sanitize-html";

interface UIEmailItem {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export class TelegramService {
  private readonly CACHE_TTL: number = 7200;
  private readonly MAX_TG_LENGTH: number = 3800;
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
      await this.renderEmailGrid(ctx, emails, "🗓️ <b>Today's Inbox Activity</b>");
    } catch (error) {
      this.logAndReplyError(ctx, "Summary", error);
    }
  }

  public async handleSearchPrompt(ctx: Context): Promise<void> {
    await ctx.reply("🔎 <b>Search Mode</b>\nType keywords to find emails.", {
      parse_mode: "HTML",
    });
  }

  public async sendSettings(ctx: Context): Promise<void> {
    await ctx.reply("⚙️ <b>Settings</b>", {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔗 Manage Accounts", url: "https://bettermail.tech/" }],
        ],
      },
    });
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
      result.emails.map(async (e: any) => {
        const shortId = crypto.randomBytes(4).toString("hex");
        await redis.set(`tg:btn:${shortId}`, e.threadId, "EX", 7200);

        return {
          id: shortId,
          subject: this.escapeHtml(e.subject || "(No Subject)"),
          from: this.escapeHtml(e.from?.name || e.from?.email || "Unknown"),
          // Snippet is always available from ES — no body fetch needed for the list view
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
          `${i + 1}. <b>${e.subject}</b>\n👤 ${e.from}\n<i>${e.snippet.slice(0, 80)}...</i>`,
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
    if (action === "view") await this.handleViewFullThread(ctx, threadId);
  }

  private async handleViewFullThread(
    ctx: Context,
    threadId: string,
  ): Promise<void> {
    const userId = await this.requireUserId(ctx);
    if (!userId) return;
    await ctx.replyWithChatAction("typing");

    try {
      const { emails: addrs } = await getUserEmails(userId);
      const { emails } = await this.elasticService.getEmailsByThreadId({
        threadId,
        emailAddresses: addrs || [],
      });

      if (!emails?.length) return void ctx.reply("❌ Thread not accessible.");

      // Fetch bodies live from provider in parallel — nothing stored
      const bodiesMap = new Map<string, string>();
      await Promise.all(
        emails.map(async (e) => {
          try {
            let bodyHtml: string | null = null;
            let bodyText: string | null = null;

            if (e.provider === "gmail") {
              const svc = new GmailApiService({ email: e.emailAddress });
              const body = await svc.fetchMessageBody(e.providerMessageId);
              bodyHtml = body.bodyHtml;
              bodyText = body.bodyText;
            } else {
              const svc = new OutlookApiService({ email: e.emailAddress });
              const body = await svc.fetchMessageBody(e.providerMessageId);
              bodyHtml = body.bodyHtml;
              bodyText = body.bodyText;
            }

            const plain = bodyHtml
              ? sanitizeHtml(bodyHtml, { allowedTags: [], allowedAttributes: {} })
              : bodyText ?? "";

            bodiesMap.set(e.providerMessageId, plain);
          } catch {
            // Fall back to snippet if provider fetch fails
            bodiesMap.set(e.providerMessageId, e.snippet ?? "");
          }
        }),
      );

      const subject = this.escapeHtml(emails[0].subject || "(No Subject)");
      const header = `🧵 <b>THREAD: ${subject}</b>\n📂 <code>${threadId}</code>\n\n`;

      const allChunks: string[] = [];
      let currentChunk = header;

      emails
        .sort(
          (a, b) =>
            new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
        )
        .forEach((e, i) => {
          const from = this.escapeHtml(e.from.name || e.from.email);
          const date = new Date(e.receivedAt).toLocaleString();
          const body = this.escapeHtml(
            bodiesMap.get(e.providerMessageId) || e.snippet || "No content.",
          );

          const emailHeader = `👤 <b>From:</b> ${from}\n📅 <b>Date:</b> ${date}\n\n`;
          const emailFooter =
            i < emails.length - 1
              ? "\n\n<code>━━━━━ (Reply) ━━━━━</code>\n\n"
              : "";

          const fullEmailBlock = emailHeader + body + emailFooter;

          if ((currentChunk + fullEmailBlock).length <= this.MAX_TG_LENGTH) {
            currentChunk += fullEmailBlock;
          } else {
            if (fullEmailBlock.length > this.MAX_TG_LENGTH) {
              if (currentChunk) allChunks.push(currentChunk);
              const massiveBody = emailHeader + body;
              const subParts =
                massiveBody.match(
                  new RegExp(`.{1,${this.MAX_TG_LENGTH}}`, "gs"),
                ) || [];
              for (let j = 0; j < subParts.length - 1; j++) {
                allChunks.push(subParts[j]);
              }
              currentChunk = subParts[subParts.length - 1] + emailFooter;
            } else {
              allChunks.push(currentChunk);
              currentChunk = fullEmailBlock;
            }
          }
        });

      if (currentChunk) allChunks.push(currentChunk);

      for (let k = 0; k < allChunks.length - 1; k++) {
        await ctx.reply(allChunks[k], { parse_mode: "HTML" });
      }

      await ctx.reply(allChunks[allChunks.length - 1], {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✉️ Reply All", callback_data: `reply_all:${threadId}` },
              { text: "📥 Archive", callback_data: `archive:${threadId}` },
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

  private logAndReplyError(ctx: Context, context: string, error: any) {
    logger.error(`[TG ${context}]: ${error.message}`);
    ctx.reply(`❌ Error loading ${context.toLowerCase()}.`);
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