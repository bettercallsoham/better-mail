import { Client } from "@elastic/elasticsearch";
import { EmbeddingsService } from "./embeddings.service";
import { gpt4oMiniLLM } from "../../config/llm";

export type MemoryType = "episodic" | "semantic" | "procedural";
export type MemoryConfidence = "CONFIRMED" | "INFERRED" | "RECENT";

export interface UserMemory {
  memoryId: string;
  userId: string;
  content: string;
  type: MemoryType;
  confidence: MemoryConfidence;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  sourceConversationId?: string;
}

const MEMORY_INDEX = "user_memory_v1";

const EXTRACTION_PROMPT = `You are a memory extraction system for an AI email assistant.
Analyze this conversation turn and extract ONLY facts worth remembering long-term.

Rules:
- Extract user preferences, habits, constraints, and important context
- Do NOT extract transient requests ("find email X") — only persistent facts
- Do NOT hallucinate or infer beyond what is clearly stated
- Return JSON array only, no other text

Confidence levels:
- CONFIRMED: User explicitly stated this ("I don't want", "I prefer", "I always", "I never")
- INFERRED: Strongly implied by behavior (asked same thing 3 times = likely preference)
- RECENT: Time-sensitive fact worth remembering short-term (recent event, deadline)

Memory types:
- semantic: persistent preferences/facts ("user prefers short replies", "user is in IST timezone")
- episodic: specific past events ("user unsubscribed from newsletter X on Jan 5")
- procedural: how user likes things done ("user always wants approval before sending emails")

Output format (JSON array):
[
  {
    "content": "User prefers concise responses under 3 sentences",
    "type": "semantic",
    "confidence": "INFERRED"
  }
]

If nothing worth remembering, return: []

Conversation turn:
User: {userMessage}
Assistant: {assistantMessage}`;

const UPDATE_PROMPT = `You are managing a memory store. A new fact was extracted. Decide what to do with existing similar memories.

New fact: {newFact}

Similar existing memories:
{existingMemories}

Return JSON with one of these operations:
- {"op": "ADD"} — new fact, no conflict
- {"op": "UPDATE", "memoryId": "...", "content": "..."} — update existing with richer info
- {"op": "DELETE", "memoryId": "..."} — new fact contradicts existing, remove old
- {"op": "NOOP"} — fact already captured, nothing to do

Return only JSON, no other text.`;

export class MemoryService {
  private index = MEMORY_INDEX;

  constructor(
    private elastic: Client,
    private embeddings: EmbeddingsService,
  ) {
    this.ensureIndex();
  }

  async ensureIndex(): Promise<void> {
    const exists = await this.elastic.indices.exists({ index: this.index });
    if (exists) return;

    await this.elastic.indices.create({
      index: this.index,
      mappings: {
        properties: {
          memoryId: { type: "keyword" },
          userId: { type: "keyword" },
          content: { type: "text" },
          type: { type: "keyword" },
          confidence: { type: "keyword" },
          embedding: {
            type: "dense_vector",
            dims: 1536,
            index: true,
            similarity: "cosine",
          },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
          lastAccessedAt: { type: "date" },
          accessCount: { type: "integer" },
          sourceConversationId: { type: "keyword" },
        },
      },
    });
  }

  /**
   * Call this AFTER a conversation turn completes.
   * Fire-and-forget — never await this in the hot path.
   */
  async extract(
    userId: string,
    turn: { user: string; assistant: string; conversationId?: string },
  ): Promise<void> {
    try {
      const prompt = EXTRACTION_PROMPT.replace(
        "{userMessage}",
        turn.user.slice(0, 1000),
      ).replace("{assistantMessage}", turn.assistant.slice(0, 1000));

      const response = await gpt4oMiniLLM.invoke([
        { role: "user", content: prompt },
      ]);

      const raw = response.content.toString().trim();
      let extracted: Array<{
        content: string;
        type: MemoryType;
        confidence: MemoryConfidence;
      }> = [];

      try {
        extracted = JSON.parse(raw);
      } catch {
        return; // LLM returned non-JSON, skip silently
      }

      if (!Array.isArray(extracted) || extracted.length === 0) return;

      // Process each extracted fact
      await Promise.allSettled(
        extracted.map((fact) =>
          this.consolidate(userId, fact, turn.conversationId),
        ),
      );
    } catch (err) {
      // Never throw — this runs in background
      console.error("[MemoryService.extract] failed silently:", err);
    }
  }

  /**
   * Call this BEFORE building the system prompt.
   * Returns a formatted memory block ready to inject.
   */
  async inject(userId: string, query: string): Promise<string> {
    try {
      const memories = await this.recall(userId, query, 8);
      if (memories.length === 0) return "";

      // Update access tracking async (non-blocking)
      this.touchMemories(memories.map((m) => m.memoryId)).catch(() => {});

      const lines = memories.map((m) => `[${m.confidence}] ${m.content}`);

      return `--- User Memory ---\n${lines.join("\n")}\n-------------------`;
    } catch {
      return ""; // Never block the LLM call
    }
  }

  /**
   * Retrieve semantically relevant memories for a query.
   */
  async recall(userId: string, query: string, topK = 5): Promise<UserMemory[]> {
    const queryVector = await this.embeddings.generate(query);

    const result = await this.elastic.search<UserMemory>({
      index: this.index,
      size: topK,
      query: {
        bool: {
          must: [{ term: { userId } }],
        },
      },
      knn: {
        field: "embedding",
        query_vector: queryVector,
        k: topK,
        num_candidates: 50,
        filter: { term: { userId } },
      },
      rank: { rrf: {} }, // reciprocal rank fusion — hybrid search
    });

    return result.hits.hits
      .map((h) => h._source)
      .filter((s): s is UserMemory => !!s);
  }

  /**
   * Manually set a memory fact — for user overrides.
   */
  async set(
    userId: string,
    content: string,
    type: MemoryType = "semantic",
    confidence: MemoryConfidence = "CONFIRMED",
  ): Promise<string> {
    const memoryId = crypto.randomUUID();
    const embedding = await this.embeddings.generate(content);
    const now = new Date();

    const memory: UserMemory = {
      memoryId,
      userId,
      content,
      type,
      confidence,
      embedding,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };

    await this.elastic.index({
      index: this.index,
      id: memoryId,
      document: memory,
    });

    return memoryId;
  }

  /**
   * Delete a specific memory by ID.
   */
  async forget(userId: string, memoryId: string): Promise<void> {
    await this.elastic.delete({
      index: this.index,
      id: memoryId,
      routing: userId,
    });
  }

  /**
   * Get all memories for a user (for debug/admin).
   */
  async getAll(userId: string): Promise<UserMemory[]> {
    const result = await this.elastic.search<UserMemory>({
      index: this.index,
      size: 100,
      query: { term: { userId } },
      sort: [{ updatedAt: { order: "desc" } }],
    });

    return result.hits.hits
      .map((h) => h._source)
      .filter((s): s is UserMemory => !!s);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async consolidate(
    userId: string,
    fact: { content: string; type: MemoryType; confidence: MemoryConfidence },
    conversationId?: string,
  ): Promise<void> {
    // Find top-3 semantically similar existing memories
    const similar = await this.recall(userId, fact.content, 3);

    let operation: "ADD" | "UPDATE" | "DELETE" | "NOOP" = "ADD";
    let targetMemoryId: string | undefined;
    let updatedContent: string | undefined;

    if (similar.length > 0) {
      const prompt = UPDATE_PROMPT.replace("{newFact}", fact.content).replace(
        "{existingMemories}",
        similar.map((m) => `[${m.memoryId}] ${m.content}`).join("\n"),
      );

      try {
        const response = await gpt4oMiniLLM.invoke([
          { role: "user", content: prompt },
        ]);
        const decision = JSON.parse(response.content.toString().trim());
        operation = decision.op ?? "ADD";
        targetMemoryId = decision.memoryId;
        updatedContent = decision.content;
      } catch {
        operation = "ADD"; // default to ADD on parse failure
      }
    }

    const now = new Date();

    switch (operation) {
      case "ADD": {
        const embedding = await this.embeddings.generate(fact.content);
        const memoryId = crypto.randomUUID();
        await this.elastic.index({
          index: this.index,
          id: memoryId,
          document: {
            memoryId,
            userId,
            content: fact.content,
            type: fact.type,
            confidence: fact.confidence,
            embedding,
            createdAt: now,
            updatedAt: now,
            accessCount: 0,
            sourceConversationId: conversationId,
          } satisfies UserMemory,
        });
        break;
      }

      case "UPDATE": {
        if (!targetMemoryId || !updatedContent) break;
        const embedding = await this.embeddings.generate(updatedContent);
        await this.elastic.update({
          index: this.index,
          id: targetMemoryId,
          doc: {
            content: updatedContent,
            confidence: fact.confidence,
            embedding,
            updatedAt: now,
          },
        });
        break;
      }

      case "DELETE": {
        if (!targetMemoryId) break;
        await this.elastic.delete({ index: this.index, id: targetMemoryId });
        // Then ADD the new fact
        const embedding = await this.embeddings.generate(fact.content);
        const memoryId = crypto.randomUUID();
        await this.elastic.index({
          index: this.index,
          id: memoryId,
          document: {
            memoryId,
            userId,
            content: fact.content,
            type: fact.type,
            confidence: fact.confidence,
            embedding,
            createdAt: now,
            updatedAt: now,
            accessCount: 0,
            sourceConversationId: conversationId,
          } satisfies UserMemory,
        });
        break;
      }

      case "NOOP":
      default:
        break;
    }
  }

  private async touchMemories(memoryIds: string[]): Promise<void> {
    const now = new Date();
    await Promise.all(
      memoryIds.map((id) =>
        this.elastic
          .update({
            index: this.index,
            id,
            doc: {
              lastAccessedAt: now,
              accessCount: {
                // script increment
              },
            },
            script: {
              source:
                "ctx._source.accessCount += 1; ctx._source.lastAccessedAt = params.now",
              params: { now: now.toISOString() },
            },
          })
          .catch(() => {}),
      ),
    );
  }
}
