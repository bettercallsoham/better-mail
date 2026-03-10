import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  AISummaryService,
  AIReplyService,
  AISuggestEmailService,
} from "../../shared/services/ai/ai.service";
import { EmbeddingsService } from "../../shared/services/ai/embeddings.service";
import { RAGService } from "../../shared/services/ai/rag.service";
import { VectorSearchService } from "../../shared/services/elastic/vector-search.service";
import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import {
  ThreadService,
  ThreadSummary,
} from "../../shared/services/elastic/thread.service";
import { GmailApiService } from "../../shared/services/gmail/gmail-api.service";
import { OutlookApiService } from "../../shared/services/outlook/outlook-api.service";
import { logger } from "../../shared/utils/logger";
import sanitizeHtml from "sanitize-html";

const elasticService = new ElasticsearchService(elasticClient);
const threadService = new ThreadService(elasticService);
const vectorSearchService = new VectorSearchService(elasticClient);
const embeddingsService = new EmbeddingsService();
const ragService = new RAGService(embeddingsService, vectorSearchService);
const aiService = new AISummaryService(ragService);
const aiReplyService = new AIReplyService(ragService);
const aiSuggestEmailService = new AISuggestEmailService();

function stripQuotedReplies(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n")
    .replace(/On .+wrote:\s*/gs, "")
    .replace(/[-_]{3,}/g, "")
    .trim();
}

/**
 * Fetch plain text body for a single email from its provider.
 * HTML stripped, quoted replies removed.
 * Falls back to empty string on failure — caller uses snippet instead.
 */
async function fetchBodyText(email: {
  provider: string;
  emailAddress: string;
  providerMessageId: string;
}): Promise<string> {
  try {
    let bodyHtml: string | null = null;
    let bodyText: string | null = null;

    if (email.provider === "gmail") {
      const svc = new GmailApiService({ email: email.emailAddress });
      const body = await svc.fetchMessageBody(email.providerMessageId);
      bodyHtml = body.bodyHtml;
      bodyText = body.bodyText;
    } else {
      const svc = new OutlookApiService({ email: email.emailAddress });
      const body = await svc.fetchMessageBody(email.providerMessageId);
      bodyHtml = body.bodyHtml;
      bodyText = body.bodyText;
    }

    const raw = bodyHtml
      ? sanitizeHtml(bodyHtml, { allowedTags: [], allowedAttributes: {} })
      : bodyText ?? "";

    return stripQuotedReplies(raw);
  } catch (err) {
    logger.warn(
      `Failed to fetch body for ${email.providerMessageId}: ${err}`,
    );
    return "";
  }
}

/**
 * Summarize email thread
 * POST /api/ai/threads/:threadId/summarize
 * Body: { emailAddress: string, forceRefresh?: boolean }
 */
export const summarizeThread = asyncHandler(
  async (req: Request, res: Response) => {
    const { threadId } = req.params as { threadId: string };
    const { emailAddress, forceRefresh = false } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!emailAddress) {
      return res.status(400).json({ success: false, message: "emailAddress is required in request body" });
    }

    try {
      logger.info(`Summarizing thread ${threadId} for user ${userId}`);

      // Metadata from ES + existing summary in parallel — no body in ES
      const [{ emails }, existingSummary] = await Promise.all([
        elasticService.getEmailsByThreadId({ threadId, emailAddresses: [emailAddress] }),
        threadService.getThreadSummary(threadId, emailAddress),
      ]);

      if (emails.length === 0) {
        return res.status(404).json({ success: false, message: "Thread not found or empty" });
      }

      const latestEmailDate = emails[emails.length - 1].receivedAt;
      const needsUpdate = threadService.needsSummaryUpdate(
        existingSummary?.metadata,
        latestEmailDate,
      );

      // Return cached summary if still valid
      if (existingSummary && !needsUpdate && !forceRefresh) {
        return res.json({ success: true, cached: true, summary: existingSummary.summary });
      }

      // Fetch bodies live from provider in parallel — nothing stored
      const bodiesMap = new Map<string, string>();
      await Promise.all(
        emails.map(async (email) => {
          const body = await fetchBodyText({
            provider: email.provider,
            emailAddress: email.emailAddress,
            providerMessageId: email.providerMessageId,
          });
          bodiesMap.set(email.providerMessageId, body);
        }),
      );

      const emailsText = emails
        .map((email, i) => {
          const body = bodiesMap.get(email.providerMessageId) || email.snippet || "";
          const truncatedBody =
            body.length > 1000
              ? body.substring(0, 800) + "\n[...truncated...]"
              : body;

          return `Email ${i + 1}:
From: ${email.from.name || email.from.email}
To: ${email.to.map((t) => t.name || t.email).join(", ")}
Date: ${new Date(email.receivedAt).toLocaleString()}
Subject: ${email.subject || "(no subject)"}
${email.isStarred ? "[STARRED]" : ""}

${truncatedBody}

---`;
        })
        .join("\n\n");

      const summaryData = await aiService.summarizeThread({
        emailsText,
        previousSummary: existingSummary?.summary.text,
      });

      const summary: ThreadSummary = {
        text: summaryData.summary,
        keyPoints: summaryData.keyPoints.join("\n"),
        actionItems: summaryData.actionItems.join("\n"),
        sentiment: summaryData.sentiment,
        priority: summaryData.priority,
      };

      await threadService.saveThreadSummary({
        threadId,
        emailAddress,
        summary,
        summarizedUpToDate: latestEmailDate,
      });

      res.json({ success: true, cached: false, summary });

      logger.info(`Thread ${threadId} summarized successfully`);
    } catch (error: any) {
      logger.error("Summarization error:", { error: error.message });
      throw error;
    }
  },
  "summarizeThread",
);

/**
 * Suggest AI replies for an email thread
 * POST /api/ai/threads/:threadId/suggest-reply
 * Body: { emailAddress: string }
 */
export const suggestReply = asyncHandler(
  async (req: Request, res: Response) => {
    const { threadId } = req.params as { threadId: string };
    const { emailAddress } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    try {
      logger.info(`Generating reply suggestions for thread ${threadId}, user ${userId}`);

      // Metadata from ES — no body
      const { emails } = await elasticService.getEmailsByThreadId({
        threadId,
        emailAddresses: [emailAddress],
      });

      if (emails.length === 0) {
        return res.status(404).json({ success: false, message: "Thread not found or empty" });
      }

      // Fetch bodies live from provider in parallel — nothing stored
      const bodiesMap = new Map<string, string>();
      await Promise.all(
        emails.map(async (email) => {
          const body = await fetchBodyText({
            provider: email.provider,
            emailAddress: email.emailAddress,
            providerMessageId: email.providerMessageId,
          });
          bodiesMap.set(email.providerMessageId, body);
        }),
      );

      const lastEmail = emails[emails.length - 1];
      const subject = lastEmail.subject || "(no subject)";
      const lastEmailFrom = lastEmail.from.name
        ? `${lastEmail.from.name} <${lastEmail.from.email}>`
        : lastEmail.from.email;
      const lastEmailTo = lastEmail.to
        .map((t: any) => (t.name ? `${t.name} <${t.email}>` : t.email))
        .join(", ");

      const emailsText = emails
        .map((email, i) => {
          const body = bodiesMap.get(email.providerMessageId) || email.snippet || "";
          const truncatedBody =
            body.length > 1000
              ? body.substring(0, 800) + "\n[...truncated...]"
              : body;

          return `Email ${i + 1}:
From: ${email.from.name || email.from.email}
To: ${email.to.map((t) => t.name || t.email).join(", ")}
Date: ${new Date(email.receivedAt).toLocaleString()}
Subject: ${email.subject || "(no subject)"}

${truncatedBody}

---`;
        })
        .join("\n\n");

      const { suggestions } = await aiReplyService.suggestReplies({
        emailsText,
        subject,
        lastEmailFrom,
        lastEmailTo,
        userEmailAddress: emailAddress,
        userId,
        threadId,
      });

      return res.json({ success: true, suggestions });
    } catch (error: any) {
      logger.error("Reply suggestion error:", { error: error.message });
      throw error;
    }
  },
  "suggestReply",
);

/**
 * Compose a new email or rewrite an existing draft
 * POST /api/ai/suggest-email
 */
export const suggestEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const {
      mode,
      topic,
      draft,
      tone,
      recipientName,
      subjectHint,
      refineInstruction,
      senderEmail,
    } = req.body;

    try {
      logger.info(`Suggest email (${mode}) for user ${userId}`);

      const result = await aiSuggestEmailService.suggestEmail({
        mode,
        topic,
        draft,
        tone,
        recipientName,
        subjectHint,
        refineInstruction,
        senderEmail,
      });

      return res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error("Suggest email error:", { error: error.message });
      throw error;
    }
  },
  "suggestEmail",
);