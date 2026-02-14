import { Client } from "@elastic/elasticsearch";
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
  private readonly CACHE_TTL = 300;

  constructor(client: Client) {
    this.client = client;
  }

  // ============================================
  // CREATE
  // ============================================

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
      refresh: "wait_for", // Wait for refresh so message is immediately searchable
    });

    await redis.del(this.getCacheKey(message.conversationId));
  }

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

    await redis.setex(
      `summary:${summary.conversationId}`,
      this.CACHE_TTL,
      JSON.stringify(summary),
    );
  }

  // ============================================
  // READ
  // ============================================

  async getRecentMessages(
    conversationId: string,
    limit: number = 20,
    includeIncomplete: boolean = false,
  ): Promise<ConversationMessage[]> {
    const cacheKey = this.getCacheKey(conversationId);
    const cached = await redis.get(cacheKey);

    if (cached) {
      const messages: ConversationMessage[] = JSON.parse(cached);
      return messages.slice(-limit);
    }

    const mustConditions: any[] = [{ term: { conversationId } }];

    if (!includeIncomplete) {
      mustConditions.push({ term: { status: "completed" } });
    }

    const result = await this.client.search({
      index: this.CONVERSATIONS_INDEX,
      _source_excludes: ["embeddings"],
      body: {
        query: {
          bool: { must: mustConditions },
        },
        sort: [
          { createdAt: "asc" },
          { messageId: "asc" }, // Use messageId (keyword field) as tie-breaker
        ],
        size: 1000, // fetch reasonably sized batch for cache
      },
    });

    const messages = result.hits.hits.map((hit: any) =>
      this.parseMessage(hit._source),
    );

    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(messages));

    return messages.slice(-limit);
  }

  async getSummary(
    conversationId: string,
  ): Promise<ConversationSummary | null> {
    const cacheKey = `summary:${conversationId}`;
    const cached = await redis.get(cacheKey);

    if (cached) return JSON.parse(cached);

    try {
      const result = await this.client.get({
        index: this.SUMMARIES_INDEX,
        id: conversationId,
      });

      const summary = this.parseSummary(result._source);

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(summary));

      return summary;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) return null;
      throw error;
    }
  }

  async getMessageById(messageId: string): Promise<ConversationMessage | null> {
    try {
      const result = await this.client.get({
        index: this.CONVERSATIONS_INDEX,
        id: messageId,
      });

      return this.parseMessage(result._source);
    } catch (error: any) {
      if (error.meta?.statusCode === 404) return null;
      throw error;
    }
  }

  async getConversationContext(conversationId: string) {
    const [summary, messages] = await Promise.all([
      this.getSummary(conversationId),
      this.getRecentMessages(conversationId, 10, true), // Include incomplete messages
    ]);

    return { summary, messages };
  }

  // ============================================
  // UPDATE
  // ============================================

  async updateMessage(
    conversationId: string,
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

    if (updates.metadata) doc.metadata = updates.metadata;
    if (updates.embeddings) doc.embeddings = updates.embeddings;

    await this.client.update({
      index: this.CONVERSATIONS_INDEX,
      id: messageId,
      doc,
      refresh: false,
    });

    await redis.del(this.getCacheKey(conversationId));
  }

  // ============================================
  // UTILITIES
  // ============================================

  private getCacheKey(conversationId: string): string {
    return `conversation:${conversationId}:messages`;
  }

  private parseMessage(source: any): ConversationMessage {
    return {
      ...source,
      createdAt: new Date(source.createdAt),
      updatedAt: new Date(source.updatedAt),
      completedAt: source.completedAt
        ? new Date(source.completedAt)
        : undefined,
    };
  }

  private parseSummary(source: any): ConversationSummary {
    return {
      ...source,
      createdAt: new Date(source.createdAt),
      updatedAt: new Date(source.updatedAt),
      lastMessageAt: new Date(source.lastMessageAt),
    };
  }
}
