import { Client } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";
import { redis } from "../../config/redis";

// ============================================
// Types
// ============================================

export interface ConversationMessage {
  messageId: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sequence: number;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  embeddings?: number[];
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTimeMs?: number;
    errorMessage?: string;
    toolCalls?: Array<{
      toolName: string;
      result?: any;
      executionTimeMs?: number;
    }>;
  };
}

export interface ConversationSummary {
  conversationId: string;
  userId: string;
  summary: string;
  title: string;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Service
// ============================================

export class ConversationService {
  private readonly client: Client;
  private readonly CONVERSATIONS_INDEX = "conversations_v1";
  private readonly SUMMARIES_INDEX = "conversation_summaries_v1";
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(client: Client) {
    this.client = client;
  }

  // ============================================
  // CREATE
  // ============================================

  /**
   * Create a new message in the conversation
   */
  async createMessage(message: ConversationMessage): Promise<void> {
    await this.client.index({
      index: this.CONVERSATIONS_INDEX,
      id: message.messageId,
      document: {
        ...message,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        completedAt: message.completedAt?.toISOString(),
      },
      refresh: false, // Don't wait for refresh
    });

    // Invalidate cached conversation
    await redis.del(this.getCacheKey(message.conversationId));
  }

  /**
   * Store or update conversation summary
   */
  async createOrUpdateSummary(summary: ConversationSummary): Promise<void> {
    await this.client.index({
      index: this.SUMMARIES_INDEX,
      id: summary.conversationId,
      document: {
        ...summary,
        createdAt: summary.createdAt.toISOString(),
        updatedAt: summary.updatedAt.toISOString(),
        lastMessageAt: summary.lastMessageAt.toISOString(),
      },
      refresh: false,
    });

    // Cache the summary
    const cacheKey = `summary:${summary.conversationId}`;
    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(summary));
  }

  // ============================================
  // READ
  // ============================================

  /**
   * Get recent messages from conversation (cached)
   * Returns last N messages in chronological order
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 20,
  ): Promise<ConversationMessage[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(conversationId);
    const cached = await redis.get(cacheKey);
    if (cached) {
      const messages: ConversationMessage[] = JSON.parse(cached);
      return messages.slice(-limit); // Return last N
    }

    // Fetch from Elasticsearch
    const result = await this.client.search({
      index: this.CONVERSATIONS_INDEX,
      _source_excludes: ["embeddings"], // Don't return embeddings by default
      body: {
        query: {
          bool: {
            must: [
              { term: { conversationId } },
              { term: { status: "completed" } }, // Only completed messages for context
            ],
          },
        },
        sort: [{ sequence: "desc" }],
        size: limit,
      },
    });

    const messages = result.hits.hits
      .map((hit: any) => this.parseMessage(hit._source))
      .reverse(); // Chronological order

    // Cache it
    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(messages));

    return messages;
  }

  /**
   * Get conversation summary (cached)
   */
  async getSummary(
    conversationId: string,
  ): Promise<ConversationSummary | null> {
    // Check cache
    const cacheKey = `summary:${conversationId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from Elasticsearch
    try {
      const result = await this.client.get({
        index: this.SUMMARIES_INDEX,
        id: conversationId,
      });

      const summary = this.parseSummary(result._source);

      // Cache it
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(summary));

      return summary;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * Get next sequence number for conversation
   */
  async getNextSequence(conversationId: string): Promise<number> {
    const result = await this.client.search({
      index: this.CONVERSATIONS_INDEX,
      body: {
        query: { term: { conversationId } },
        sort: [{ sequence: "desc" }],
        size: 1,
        _source: ["sequence"],
      },
    });

    if (result.hits.hits.length === 0) return 1;
    return (result.hits.hits[0]._source as any).sequence + 1;
  }

  // ============================================
  // UPDATE
  // ============================================

  /**
   * Update message status and metadata
   */
  async updateMessage(
    messageId: string,
    updates: {
      status?: ConversationMessage["status"];
      metadata?: ConversationMessage["metadata"];
      embeddings?: number[];
    },
  ): Promise<void> {
    const doc: any = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.status) {
      doc.status = updates.status;
      if (["completed", "failed", "cancelled"].includes(updates.status)) {
        doc.completedAt = new Date().toISOString();
      }
    }

    if (updates.metadata) {
      doc.metadata = updates.metadata;
    }

    if (updates.embeddings) {
      doc.embeddings = updates.embeddings;
    }

    await this.client.update({
      index: this.CONVERSATIONS_INDEX,
      id: messageId,
      doc,
      refresh: false,
    });
  }

  // ============================================
  // UTILITIES
  // ============================================

  private getCacheKey(conversationId: string): string {
    return `conversation:${conversationId}:messages`;
  }

  private parseMessage(source: any): ConversationMessage {
    return {
      messageId: source.messageId,
      conversationId: source.conversationId,
      userId: source.userId,
      role: source.role,
      content: source.content,
      sequence: source.sequence,
      status: source.status,
      createdAt: new Date(source.createdAt),
      updatedAt: new Date(source.updatedAt),
      completedAt: source.completedAt
        ? new Date(source.completedAt)
        : undefined,
      embeddings: source.embeddings,
      metadata: source.metadata,
    };
  }

  private parseSummary(source: any): ConversationSummary {
    return {
      conversationId: source.conversationId,
      userId: source.userId,
      summary: source.summary,
      title: source.title,
      messageCount: source.messageCount,
      lastMessageAt: new Date(source.lastMessageAt),
      createdAt: new Date(source.createdAt),
      updatedAt: new Date(source.updatedAt),
    };
  }
}
