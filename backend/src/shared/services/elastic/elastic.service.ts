import { Client, helpers } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";
import { UnifiedEmailDocument } from "./interface";

export class ElasticsearchService {
  private readonly client: Client;

  private readonly EMAILS_INDEX = "emails_v1";
  private readonly THREADS_INDEX = "threads_v1";

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Call once at app startup.
   * Fail fast if ES is misconfigured.
   */
  async ensureIndexes(): Promise<void> {
    await this.ensureEmailsIndex();
    await this.ensureThreadsIndex();
  }

  // --------------------
  // Emails index
  // --------------------

  private async ensureEmailsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.EMAILS_INDEX,
    });

    if (exists) return;

    await this.client.indices.create({
      index: this.EMAILS_INDEX,
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,

        "index.sort.field": ["receivedAt"],
        "index.sort.order": ["desc"],

        analysis: {
          analyzer: {
            email_search: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "asciifolding"],
            },
          },
        },
      },
      mappings: {
        dynamic: "strict",
        properties: {
          id: { type: "keyword" },
          emailAddress: { type: "keyword" },
          provider: { type: "keyword" },

          providerMessageId: { type: "keyword" },
          providerThreadId: { type: "keyword" },

          threadId: { type: "keyword" },
          isThreadRoot: { type: "boolean" },

          receivedAt: { type: "date" },
          sentAt: { type: "date" },
          indexedAt: { type: "date" },

          from: {
            properties: {
              name: { type: "text" },
              email: { type: "keyword" },
            },
          },

          to: {
            type: "nested",
            properties: {
              name: { type: "text" },
              email: { type: "keyword" },
            },
          },
          cc: {
            type: "nested",
            properties: {
              name: { type: "text" },
              email: { type: "keyword" },
            },
          },
          bcc: {
            type: "nested",
            properties: {
              name: { type: "text" },
              email: { type: "keyword" },
            },
          },

          subject: { type: "text", analyzer: "email_search" },
          bodyText: { type: "text", analyzer: "email_search" },
          bodyHtml: { type: "text", index: false },
          snippet: { type: "text", analyzer: "email_search" },
          searchText: { type: "text", analyzer: "email_search" },

          hasAttachments: { type: "boolean" },
          attachments: {
            type: "nested",
            properties: {
              id: { type: "keyword" },
              name: { type: "text" },
              contentType: { type: "keyword" },
              size: { type: "integer" },
              isInline: { type: "boolean" },
            },
          },

          isRead: { type: "boolean" },
          isStarred: { type: "boolean" },
          isArchived: { type: "boolean" },
          isDeleted: { type: "boolean" },

          labels: { type: "keyword" },
          providerLabels: { type: "keyword" },

          embedding: {
            type: "dense_vector",
            dims: 1536,
            index: true,
            similarity: "cosine",
          },
        },
      },
    });
  }

  // --------------------
  // Threads index
  // --------------------

  private async ensureThreadsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.THREADS_INDEX,
    });

    if (exists) return;

    await this.client.indices.create({
      index: this.THREADS_INDEX,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
      },
      mappings: {
        dynamic: "strict",
        properties: {
          threadId: { type: "keyword" },
          emailAddress: { type: "keyword" },

          notes: { type: "text" },
          requiresAction: { type: "boolean" },

          reminder: {
            properties: {
              remindAt: { type: "date" },
              status: { type: "keyword" },
            },
          },

          lastActivityAt: { type: "date" },
        },
      },
    });
  }

  // --------------------
  // EMAIL OPERATIONS
  // --------------------

  /**
   * Single insert - for real-time webhooks
   * Uses composite ID (provider_messageId) for deduplication
   */
  async indexEmail(email: UnifiedEmailDocument): Promise<void> {
    const compositeId = `${email.provider}_${email.providerMessageId}`;
    await this.client.index({
      index: this.EMAILS_INDEX,
      id: compositeId,
      document: email,
    });
  }

  /**
   * Bulk insert - uses Elasticsearch bulk API
   * Call this multiple times, batching happens internally
   */
  async bulkIndexEmails(emails: UnifiedEmailDocument[]): Promise<void> {
    if (emails.length === 0) return;

    const operations = emails.flatMap((email) => {
      const compositeId = `${email.provider}_${email.providerMessageId}`;
      return [
        { index: { _index: this.EMAILS_INDEX, _id: compositeId } },
        email,
      ];
    });

    const result = await this.client.bulk({ operations });

    if (result.errors) {
      const failed = result.items.filter((item) => item.index?.error);
      logger.error(`Bulk index failed: ${failed.length} errors`);
    } else {
      logger.info(`Indexed ${emails.length} emails`);
    }
  }

  /**
   * Update single email
   */
  async updateEmail(
    id: string,
    updates: Partial<UnifiedEmailDocument>,
  ): Promise<void> {
    await this.client.update({
      index: this.EMAILS_INDEX,
      id,
      doc: updates,
    });
  }

  /**
   * Search emails by email addresses (for a user's connected accounts)
   */

  async searchEmails(query: {
    emailAddresses: string[];
    searchText?: string;
    from?: number;
    size?: number;
  }) {
    const { emailAddresses, searchText, from = 0, size = 20 } = query;

    const must: any[] = [{ terms: { emailAddress: emailAddresses } }];

    if (searchText) {
      must.push({
        multi_match: {
          query: searchText,
          fields: ["subject^3", "searchText^2", "snippet"],
          fuzziness: "AUTO",
        },
      });
    }

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      from,
      size,
      query: { bool: { must } },
      sort: [{ receivedAt: "desc" }],
    });

    return {
      total:
        typeof result.hits.total === "number"
          ? result.hits.total
          : result.hits.total?.value || 0,
      emails: result.hits.hits.map((hit) => ({
        ...(hit._source as UnifiedEmailDocument),
        id: hit._id as string,
      })),
    };
  }

  /**
   * Top level thread Emails
   */

  async getInboxThreads(params: {
    emailAddresses: string[];
    size?: number;
    cursor?: { receivedAt: string; id: string };
  }) {
    const { emailAddresses, size = 20, cursor } = params;

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size,
      query: {
        bool: {
          filter: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
          ],
        },
      },
      sort: [
        { receivedAt: "desc" },
        { id: "asc" }, // tiebreaker
      ],
      collapse: {
        field: "threadId",
        inner_hits: [
          {
            name: "thread_state",
            size: 10, // small number is enough
            _source: ["isRead", "isStarred"],
          },
        ],
      },
      ...(cursor && {
        search_after: [cursor.receivedAt, cursor.id],
      }),
    });

    const hits = result.hits.hits;

    return {
      threads: hits.map((hit) => {
        const source = hit._source as UnifiedEmailDocument;
        const states = hit.inner_hits?.thread_state?.hits.hits ?? [];

        return {
          threadId: source.threadId,

          // latest email info
          latestEmailId: hit._id,
          subject: source.subject,
          snippet: source.snippet,
          receivedAt: source.receivedAt,

          from: source.from,
          to: source.to,

          // thread-level flags
          isUnread: states.some((s) => s._source?.isRead === false),
          isStarred: states.some((s) => s._source?.isStarred === true),
        };
      }),

      nextCursor:
        hits.length > 0
          ? {
              receivedAt: (hits[hits.length - 1]._source as any).receivedAt,
              id: hits[hits.length - 1]._id,
            }
          : null,
    };
  }

  /**
   * Get all emails in a specific thread
   */
  async getEmailsByThreadId(params: {
    threadId: string;
    emailAddresses: string[];
  }) {
    const { threadId, emailAddresses } = params;

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size: 100, // Get all emails in thread (max 100)
      query: {
        bool: {
          filter: [
            { term: { threadId } },
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
          ],
        },
      },
      sort: [{ receivedAt: "asc" }], // Chronological order for thread view
    });

    return {
      total: result.hits.total,
      emails: result.hits.hits.map((hit) => ({
        ...(hit._source as UnifiedEmailDocument),
        id: hit._id as string,
      })),
    };
  }
}
