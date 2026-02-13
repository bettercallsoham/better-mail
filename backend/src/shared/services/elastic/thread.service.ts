import { ElasticsearchService } from "./elastic.service";
import { logger } from "../../utils/logger";

export interface ThreadSummary {
  text: string;
  keyPoints: string;
  actionItems: string;
  sentiment: "positive" | "neutral" | "negative";
  priority: "low" | "medium" | "high";
}

export interface ThreadSummaryMetadata {
  summarizedUpToDate: string; // ISO date
  lastSummarizedAt: string; // ISO date
}

export interface ThreadDocument {
  threadId: string;
  emailAddress: string;
  notes?: string;
  requiresAction?: boolean;
  reminder?: {
    remindAt: string;
    status: string;
  };
  lastActivityAt: string;
  summary?: ThreadSummary;
  summaryMetadata?: ThreadSummaryMetadata;
}

export class ThreadService {
  constructor(private elasticService: ElasticsearchService) {}

  /**
   * Get thread summary if it exists
   */
  async getThreadSummary(
    threadId: string,
    emailAddress: string,
  ): Promise<{
    summary: ThreadSummary;
    metadata: ThreadSummaryMetadata;
  } | null> {
    try {
      const threadDoc = await this.getThread(threadId, emailAddress);

      if (!threadDoc?.summary) {
        return null;
      }

      return {
        summary: threadDoc.summary,
        metadata: threadDoc.summaryMetadata!,
      };
    } catch (error) {
      logger.error("Error getting thread summary:", {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Save or update thread summary
   */
  async saveThreadSummary(params: {
    threadId: string;
    emailAddress: string;
    summary: ThreadSummary;
    summarizedUpToDate: string;
  }): Promise<void> {
    const { threadId, emailAddress, summary, summarizedUpToDate } = params;

    const compositeId = `${emailAddress}_${threadId}`;

    try {
      // Check if thread document exists
      const exists = await this.threadExists(compositeId);

      const document: Partial<ThreadDocument> = {
        threadId,
        emailAddress,
        summary,
        summaryMetadata: {
          summarizedUpToDate,
          lastSummarizedAt: new Date().toISOString(),
        },
        lastActivityAt: new Date().toISOString(),
      };

      if (exists) {
        // Update existing thread
        await this.updateThread(compositeId, document);
      } else {
        // Create new thread document
        await this.createThread(compositeId, document as ThreadDocument);
      }

      logger.info(`Thread summary saved for thread ${threadId}`);
    } catch (error) {
      logger.error("Error saving thread summary:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if summary needs update (new emails since last summarization)
   */
  needsSummaryUpdate(
    metadata: ThreadSummaryMetadata | undefined,
    latestEmailDate: string,
  ): boolean {
    if (!metadata?.summarizedUpToDate) {
      return true; // No summary exists
    }

    const lastSummary = new Date(metadata.summarizedUpToDate);
    const latestEmail = new Date(latestEmailDate);

    return latestEmail > lastSummary;
  }

  // ===== Private Helper Methods =====

  private async getThread(
    threadId: string,
    emailAddress: string,
  ): Promise<ThreadDocument | null> {
    const compositeId = `${emailAddress}_${threadId}`;

    try {
      const result = await (this.elasticService as any).client.get({
        index: (this.elasticService as any).THREADS_INDEX,
        id: compositeId,
      });

      return result._source as ThreadDocument;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async threadExists(compositeId: string): Promise<boolean> {
    try {
      const result = await (this.elasticService as any).client.exists({
        index: (this.elasticService as any).THREADS_INDEX,
        id: compositeId,
      });
      return result;
    } catch (error) {
      return false;
    }
  }

  private async createThread(
    compositeId: string,
    document: ThreadDocument,
  ): Promise<void> {
    await (this.elasticService as any).client.index({
      index: (this.elasticService as any).THREADS_INDEX,
      id: compositeId,
      document,
    });
  }

  private async updateThread(
    compositeId: string,
    updates: Partial<ThreadDocument>,
  ): Promise<void> {
    await (this.elasticService as any).client.update({
      index: (this.elasticService as any).THREADS_INDEX,
      id: compositeId,
      doc: updates,
    });
  }
}
