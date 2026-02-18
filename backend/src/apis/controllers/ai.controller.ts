import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AISummaryService } from "../../shared/services/ai/ai.service";
import { EmbeddingsService } from "../../shared/services/ai/embeddings.service";
import { RAGService } from "../../shared/services/ai/rag.service";
import { VectorSearchService } from "../../shared/services/elastic/vector-search.service";
import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import {
  ThreadService,
  ThreadSummary,
} from "../../shared/services/elastic/thread.service";
import { logger } from "../../shared/utils/logger";
import sanitizeHtml from "sanitize-html";

// Initialize services with proper dependency injection
const elasticService = new ElasticsearchService(elasticClient);
const threadService = new ThreadService(elasticService);
const vectorSearchService = new VectorSearchService(elasticClient);
const embeddingsService = new EmbeddingsService();
const ragService = new RAGService(embeddingsService, vectorSearchService);
const aiService = new AISummaryService(ragService);

/**
 * Strip markdown code blocks from JSON response
 */
function cleanJsonResponse(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  return text
    .replace(/^```(?:json)?\s*\n?/g, "")
    .replace(/\n?```$/g, "")
    .trim();
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
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!emailAddress) {
      return res.status(400).json({
        success: false,
        message: "emailAddress is required in request body",
      });
    }

    try {
      logger.info(`Summarizing thread ${threadId} for user ${userId}`);

      // 1. Fetch emails and existing summary in parallel
      const [{ emails }, existingSummary] = await Promise.all([
        elasticService.getEmailsByThreadId({
          threadId,
          emailAddresses: [emailAddress],
        }),
        threadService.getThreadSummary(threadId, emailAddress),
      ]);

      if (emails.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Thread not found or empty",
        });
      }

      const latestEmailDate = emails[emails.length - 1].receivedAt;
      const needsUpdate = threadService.needsSummaryUpdate(
        existingSummary?.metadata,
        latestEmailDate,
      );

      // Return cached summary if valid and not forcing refresh
      if (existingSummary && !needsUpdate && !forceRefresh) {
        return res.json({
          success: true,
          cached: true,
          summary: existingSummary.summary,
        });
      }

      // 3. Format emails for AI
      const emailsText = emails
        .map((email, i) => {
          // Skip sanitization for plain text, only sanitize HTML
          const body = email.bodyHtml
            ? sanitizeHtml(email.bodyHtml, {
                allowedTags: [],
                allowedAttributes: {},
              })
            : email.bodyText || "";

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

      // 4. Call AI service
      const response = await aiService.summarizeThread({
        emailsText,
        previousSummary: existingSummary?.summary.text,
      });

      // 5. Parse and save summary
      try {
        const cleanedResponse = cleanJsonResponse(response);
        const summaryData = JSON.parse(cleanedResponse);
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

        res.json({
          success: true,
          cached: false,
          summary,
        });
      } catch (parseError) {
        logger.error("Failed to parse summary JSON:", {
          error: (parseError as Error).message,
        });

        // Save raw response as text fallback
        const fallbackSummary: ThreadSummary = {
          text: response,
          keyPoints: "",
          actionItems: "",
          sentiment: "neutral",
          priority: "medium",
        };

        await threadService.saveThreadSummary({
          threadId,
          emailAddress,
          summary: fallbackSummary,
          summarizedUpToDate: latestEmailDate,
        });

        res.json({
          success: true,
          cached: false,
          summary: fallbackSummary,
        });
      }

      logger.info(`Thread ${threadId} summarized successfully`);
    } catch (error: any) {
      logger.error("Summarization error:", { error: error.message });
      throw error;
    }
  },
  "summarizeThread",
);

