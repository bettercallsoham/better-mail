import { Client, helpers } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";
import { UnifiedEmailDocument } from "./interface";

export class ElasticsearchService {
  private readonly client: Client;

  private readonly EMAILS_INDEX = "emails_v1";
  private readonly THREADS_INDEX = "threads_v1";
  private readonly SAVED_SEARCHES_INDEX = "saved_searches_v1";
  private readonly SEARCH_HISTORY_INDEX = "search_history_v1";

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
    await this.ensureSavedSearchesIndex();
    await this.ensureSearchHistoryIndex();
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

          inboxState: { type: "keyword" },
          snoozeUntil: { type: "date" },

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
  // Saved Searches index
  // --------------------

  private async ensureSavedSearchesIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.SAVED_SEARCHES_INDEX,
    });

    if (exists) return;

    await this.client.indices.create({
      index: this.SAVED_SEARCHES_INDEX,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
      },
      mappings: {
        dynamic: false, // Allow child objects to control their own dynamic behavior
        properties: {
          id: { type: "keyword" },
          userId: { type: "keyword" },
          name: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          description: { type: "text" },
          query: {
            type: "object",
            enabled: true,
            dynamic: true, // Allow any nested fields in query object
          },
          usageCount: { type: "integer" },
          lastUsedAt: { type: "date" },
          isPinned: { type: "boolean" },
          color: { type: "keyword" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
    });
  }

  // --------------------
  // Search History index
  // --------------------

  private async ensureSearchHistoryIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.SEARCH_HISTORY_INDEX,
    });

    if (exists) return;

    await this.client.indices.create({
      index: this.SEARCH_HISTORY_INDEX,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
      },
      mappings: {
        dynamic: "strict",
        properties: {
          id: { type: "keyword" },
          userId: { type: "keyword" },
          searchText: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          filters: {
            type: "object",
            enabled: true,
          },
          resultsCount: { type: "integer" },
          executionTimeMs: { type: "integer" },
          emailAddresses: { type: "keyword" },
          searchedAt: { type: "date" },
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
   * Powerful search with filters, pagination, and relevance scoring
   */
  async searchEmails(params: {
    emailAddresses: string[];
    query: string;
    size?: number;
    cursor?: { score: number; receivedAt: string; id: string };
    filters?: {
      isRead?: boolean;
      isStarred?: boolean;
      isArchived?: boolean;
      hasAttachments?: boolean;
      from?: string;
      to?: string;
      labels?: string[];
      dateFrom?: string;
      dateTo?: string;
    };
  }) {
    const { emailAddresses, query, size = 20, cursor, filters = {} } = params;

    // Build filter conditions
    const mustFilters: any[] = [
      { terms: { emailAddress: emailAddresses } },
      { term: { isDeleted: false } },
    ];

    if (filters.isRead !== undefined) {
      mustFilters.push({ term: { isRead: filters.isRead } });
    }
    if (filters.isStarred !== undefined) {
      mustFilters.push({ term: { isStarred: filters.isStarred } });
    }
    if (filters.isArchived !== undefined) {
      mustFilters.push({ term: { isArchived: filters.isArchived } });
    }
    if (filters.hasAttachments !== undefined) {
      mustFilters.push({ term: { hasAttachments: filters.hasAttachments } });
    }
    if (filters.from) {
      mustFilters.push({
        match: { "from.email": { query: filters.from, operator: "and" } },
      });
    }
    if (filters.to) {
      mustFilters.push({
        match: { "to.email": { query: filters.to, operator: "and" } },
      });
    }
    if (filters.labels && filters.labels.length > 0) {
      mustFilters.push({ terms: { labels: filters.labels } });
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateRange: any = {};
      if (filters.dateFrom) dateRange.gte = filters.dateFrom;
      if (filters.dateTo) dateRange.lte = filters.dateTo;
      mustFilters.push({ range: { receivedAt: dateRange } });
    }

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  // Exact + fuzzy matching (primary)
                  {
                    multi_match: {
                      query,
                      fields: [
                        "subject^3",
                        "bodyText^2",
                        "searchText^2",
                        "snippet",
                        "from.email",
                        "to.email",
                        "cc.email",
                      ],
                      type: "best_fields",
                      operator: "or",
                      fuzziness: "AUTO",
                    },
                  },
                  // Prefix matching (for partial words like "insta") - only text fields
                  {
                    multi_match: {
                      query,
                      fields: [
                        "subject^2",
                        "bodyText^1.5",
                        "searchText^1.5",
                        "snippet",
                      ],
                      type: "phrase_prefix",
                    },
                  },
                  // Wildcard for very partial matches
                  {
                    query_string: {
                      query: `*${query}*`,
                      fields: ["subject^1.5", "bodyText", "searchText"],
                      default_operator: "OR",
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          filter: mustFilters,
        },
      },
      sort: [
        { _score: { order: "desc" } },
        { receivedAt: { order: "desc" } },
        { id: { order: "asc" } },
      ],
      ...(cursor && {
        search_after: [cursor.score, cursor.receivedAt, cursor.id],
      }),
    });

    const hits = result.hits.hits;

    return {
      emails: hits.map((hit) => ({
        _id: hit._id,
        score: hit._score,
        ...(hit._source as UnifiedEmailDocument),
      })),
      total: (result.hits.total as any).value,
      nextCursor:
        hits.length === size
          ? {
              score: hits[hits.length - 1]._score,
              receivedAt: (hits[hits.length - 1]._source as any).receivedAt,
              id: (hits[hits.length - 1]._source as any).id,
            }
          : null,
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

  /**
   * Get folder/label counts using aggregations
   * Returns both system folders (unread, starred, etc.) and all labels with counts
   */
  async getFolderCounts(emailAddresses: string[]) {
    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size: 0, // Don't return documents, only aggregations
      query: {
        bool: {
          filter: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
          ],
        },
      },
      aggs: {
        unread: {
          filter: { term: { isRead: false } },
        },
        starred: {
          filter: { term: { isStarred: true } },
        },
        archived: {
          filter: { term: { isArchived: true } },
        },
        inbox: {
          filter: { term: { labels: "INBOX" } },
        },
        sent: {
          filter: { term: { labels: "SENT" } },
        },
        important: {
          filter: { term: { labels: "IMPORTANT" } },
        },
        all_labels: {
          terms: {
            field: "labels",
            size: 50,
          },
        },
      },
    });

    const aggs = result.aggregations as any;

    // Extract label counts from terms aggregation
    const labels = aggs.all_labels.buckets.map((bucket: any) => ({
      label: bucket.key,
      count: bucket.doc_count,
    }));

    return {
      system: {
        unread: aggs.unread.doc_count,
        starred: aggs.starred.doc_count,
        archived: aggs.archived.doc_count,
        inbox: aggs.inbox.doc_count,
        sent: aggs.sent.doc_count,
        important: aggs.important.doc_count,
      },
      labels,
    };
  }

  /**
   * Get inbox zero emails - INBOX state or unsnoozed emails
   */
  async getInboxZeroEmails(params: {
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
          should: [
            // Emails explicitly in INBOX state
            { term: { inboxState: "INBOX" } },
            // Snoozed emails that have passed their snooze time
            {
              bool: {
                filter: [
                  { term: { inboxState: "SNOOZED" } },
                  { range: { snoozeUntil: { lte: "now" } } },
                ],
              },
            },
            // Emails without inboxState (legacy, treat as INBOX)
          ],
          minimum_should_match: 1,
        },
      },
      sort: [{ receivedAt: "desc" }, { id: "asc" }],
      ...(cursor && {
        search_after: [cursor.receivedAt, cursor.id],
      }),
    });

    const hits = result.hits.hits;

    return {
      emails: hits.map((hit) => hit._source as UnifiedEmailDocument),
      total: (result.hits.total as any).value,
      nextCursor:
        hits.length === size
          ? {
              receivedAt: (hits[hits.length - 1]._source as any).receivedAt,
              id: (hits[hits.length - 1]._source as any).id,
            }
          : null,
    };
  }

  /**
   * Update inbox state for emails
   */
  async updateInboxState(params: {
    provider: string;
    providerMessageIds: string[];
    inboxState: "INBOX" | "ARCHIVED" | "SNOOZED" | "DONE";
    snoozeUntil?: string;
  }): Promise<{ updated: number; errors: any[] }> {
    const { provider, providerMessageIds, inboxState, snoozeUntil } = params;

    const updates: Partial<UnifiedEmailDocument> = { inboxState };

    // Set or clear snoozeUntil based on state
    if (inboxState === "SNOOZED" && snoozeUntil) {
      updates.snoozeUntil = snoozeUntil;
    } else if (inboxState !== "SNOOZED") {
      // Clear snooze when moving to any other state
      updates.snoozeUntil = undefined;
    }

    return this.bulkUpdateEmails({
      provider,
      providerMessageIds,
      updates,
    });
  }

  /**
   * Bulk update multiple emails
   * Returns count of successful updates
   */
  async bulkUpdateEmails(params: {
    provider: string;
    providerMessageIds: string[];
    updates: Partial<UnifiedEmailDocument>;
  }): Promise<{ updated: number; errors: any[] }> {
    const { provider, providerMessageIds, updates } = params;

    const operations = providerMessageIds.flatMap((msgId) => [
      { update: { _index: this.EMAILS_INDEX, _id: `${provider}_${msgId}` } },
      { doc: updates },
    ]);

    const result = await this.client.bulk({ operations });

    const errors = result.items
      .map((item: any, idx: number) => ({
        messageId: providerMessageIds[Math.floor(idx / 2)],
        error: item.update?.error,
      }))
      .filter((item) => item.error);

    return {
      updated: providerMessageIds.length - errors.length,
      errors,
    };
  }

  // --------------------
  // SAVED SEARCHES OPERATIONS
  // --------------------

  async createSavedSearch(
    doc: import("./interface").SavedSearchDocument,
  ): Promise<void> {
    await this.client.index({
      index: this.SAVED_SEARCHES_INDEX,
      id: doc.id,
      document: doc,
    });
  }

  async getSavedSearchesByUser(
    userId: string,
  ): Promise<import("./interface").SavedSearchDocument[]> {
    const result = await this.client.search({
      index: this.SAVED_SEARCHES_INDEX,
      query: {
        term: { userId },
      },
      sort: [
        { isPinned: "desc" },
        { lastUsedAt: "desc" },
        { createdAt: "desc" },
      ],
      size: 100,
    });

    return result.hits.hits.map(
      (hit) => hit._source as import("./interface").SavedSearchDocument,
    );
  }

  async getSavedSearchById(
    id: string,
    userId: string,
  ): Promise<import("./interface").SavedSearchDocument | null> {
    try {
      const result = await this.client.get({
        index: this.SAVED_SEARCHES_INDEX,
        id,
      });

      const doc = result._source as import("./interface").SavedSearchDocument;
      if (doc.userId !== userId) {
        return null; // Not owned by user
      }

      return doc;
    } catch (error) {
      return null;
    }
  }

  async updateSavedSearch(
    id: string,
    userId: string,
    updates: Partial<import("./interface").SavedSearchDocument>,
  ): Promise<boolean> {
    try {
      // Verify ownership first
      const existing = await this.getSavedSearchById(id, userId);
      if (!existing) {
        return false;
      }

      await this.client.update({
        index: this.SAVED_SEARCHES_INDEX,
        id,
        doc: { ...updates, updatedAt: new Date().toISOString() },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteSavedSearch(id: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership first
      const existing = await this.getSavedSearchById(id, userId);
      if (!existing) {
        return false;
      }

      await this.client.delete({
        index: this.SAVED_SEARCHES_INDEX,
        id,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async incrementSearchUsage(id: string): Promise<void> {
    try {
      await this.client.update({
        index: this.SAVED_SEARCHES_INDEX,
        id,
        script: {
          source:
            "ctx._source.usageCount++; ctx._source.lastUsedAt = params.now",
          params: {
            now: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Silently fail if search doesn't exist
    }
  }

  // --------------------
  // SEARCH HISTORY OPERATIONS
  // --------------------

  async addSearchHistory(
    doc: import("./interface").SearchHistoryDocument,
  ): Promise<void> {
    // Store ALL searches with unique IDs for frequency tracking and analytics
    await this.client.index({
      index: this.SEARCH_HISTORY_INDEX,
      id: doc.id, // ID generated by worker with timestamp for uniqueness
      document: doc,
    });
  }

  async getRecentSearches(
    userId: string,
    limit: number = 10,
  ): Promise<
    Array<import("./interface").SearchHistoryDocument & { searchCount: number }>
  > {
    // Use aggregations to deduplicate by searchText and show most recent with count
    const result = await this.client.search({
      index: this.SEARCH_HISTORY_INDEX,
      query: {
        term: { userId },
      },
      size: 0, // Don't return raw hits
      aggs: {
        unique_searches: {
          terms: {
            field: "searchText.keyword",
            size: limit * 2, // Get more to ensure we have enough after filtering
            order: { latest_search: "desc" },
          },
          aggs: {
            latest_search: {
              max: {
                field: "searchedAt",
              },
            },
            search_count: {
              value_count: {
                field: "searchText.keyword",
              },
            },
            latest_doc: {
              top_hits: {
                size: 1,
                sort: [{ searchedAt: "desc" }],
              },
            },
          },
        },
      },
    });

    const buckets =
      (result.aggregations?.unique_searches as any)?.buckets || [];
    return buckets.slice(0, limit).map((bucket: any) => ({
      ...(bucket.latest_doc.hits.hits[0]
        ._source as import("./interface").SearchHistoryDocument),
      searchCount: bucket.search_count.value,
    }));
  }
}
