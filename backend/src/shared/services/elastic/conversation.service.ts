import { Client } from "@elastic/elasticsearch";
import { redis } from "../../config/redis";

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
    userDecision?: string;
  };

  toolCalls?: Array<{
    toolName: string;
    input?: any;
    output?: any;
    status?: string;
  }>;

  sources?: Array<{
    type: string;
    emailId?: string;
    snippet?: string;
    [key: string]: any;
  }>;
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

export interface PaginatedMessages {
  messages: ConversationMessage[];
  nextCursor: any[] | null;
}

export class ConversationService {
  private readonly client: Client;
  private readonly CONVERSATIONS_INDEX = "conversations_v1";
  private readonly SUMMARIES_INDEX = "conversation_summaries_v1";
  private readonly CACHE_TTL = 300;
  
  constructor(client: Client) {
    this.client = client;
  }

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
      refresh: "wait_for",
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
    });

    await redis.setex(
      `summary:${summary.conversationId}`,
      this.CACHE_TTL,
      JSON.stringify(summary),
    );
  }

  async getRecentMessages(
    conversationId: string,
    params: {
      limit?: number;
      cursor?: any[];
      includeIncomplete?: boolean;
    } = {},
  ): Promise<PaginatedMessages> {
    const { limit = 10, cursor, includeIncomplete = true } = params;

    const mustConditions: any[] = [{ term: { conversationId } }];
    if (!includeIncomplete) {
      mustConditions.push({ term: { status: "completed" } });
    }

    const result = await this.client.search({
      index: this.CONVERSATIONS_INDEX,
      _source_excludes: ["embeddings"],
      body: {
        size: limit,
        query: {
          bool: { must: mustConditions },
        },
        // Sort DESC to get the latest messages first
        sort: [{ createdAt: "desc" }, { messageId: "asc" }],
        ...(cursor && { search_after: cursor }),
      },
    });

    const hits = result.hits.hits;

    const messages = hits
      .map((hit: any) => this.parseMessage(hit._source))
      .reverse();

    const nextCursor =
      hits.length === limit && hits.length > 0
        ? (hits[hits.length - 1].sort as any[])
        : null;

    return { messages, nextCursor };
  }

  async getConversationContext(conversationId: string) {
    const [summary, paginated] = await Promise.all([
      this.getSummary(conversationId),
      this.getRecentMessages(conversationId, { limit: 15 }),
    ]);

    return {
      title: summary?.title || "New Conversation",
      summary: summary?.summary,
      messages: paginated.messages,
      nextCursor: paginated.nextCursor,
    };
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
    });

    await redis.del(this.getCacheKey(conversationId));
  }

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

  async getUserConversations(
    userId: string,
    params: { limit?: number; cursor?: any[] } = {},
  ): Promise<{ summaries: ConversationSummary[]; nextCursor: any[] | null }> {
    const { limit = 20, cursor } = params;

    const result = await this.client.search({
      index: this.SUMMARIES_INDEX,
      body: {
        size: limit,
        query: {
          bool: { must: [{ term: { userId } }] },
        },
        sort: [{ lastMessageAt: "desc" }, { conversationId: "asc" }],
        ...(cursor && { search_after: cursor }),
      },
    });

    const hits = result.hits.hits;
    const summaries = hits.map((hit: any) => this.parseSummary(hit._source));

    const nextCursor =
      hits.length === limit ? (hits[hits.length - 1].sort as any[]) : null;

    return { summaries, nextCursor };
  }
}
