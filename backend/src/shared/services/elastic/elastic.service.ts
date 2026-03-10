import { Client, helpers } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";
import { UnifiedEmailDocument } from "./interface";

export class ElasticsearchService {
  private readonly client: Client;

  private readonly EMAILS_INDEX = "emails_v1";
  private readonly THREADS_INDEX = "threads_v1";
  private readonly SAVED_SEARCHES_INDEX = "saved_searches_v1";
  private readonly SEARCH_HISTORY_INDEX = "search_history_v1";
  private readonly CONVERSATIONS_INDEX = "conversations_v1";
  private readonly CONVERSATION_SUMMARIES_INDEX = "conversation_summaries_v1";

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
    await this.ensureConversationsIndex();
    await this.ensureConversationSummariesIndex();
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
          authorizedEmails: { type: "keyword" },
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

          subject: {
            type: "text",
            analyzer: "email_search",
          },
          snippet: {
            type: "text",
            analyzer: "email_search",
          },

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

          isDraft: { type: "boolean" },
          draftData: {
            properties: {
              providerDraftId: { type: "keyword" },
              lastEditedAt: { type: "date" },
            },
          },
          inboxState: { type: "keyword" },
          snoozeUntil: { type: "date" },

          embedding: {
            type: "dense_vector",
            dims: 1536,
            index: true,
            similarity: "cosine",
            index_options: {
              type: "int8_hnsw",
            },
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

          // AI-generated summary
          summary: {
            properties: {
              text: { type: "text" },
              keyPoints: { type: "text" },
              actionItems: { type: "text" },
              sentiment: { type: "keyword" },
              priority: { type: "keyword" },
            },
          },

          // Metadata for incremental summarization
          summaryMetadata: {
            properties: {
              summarizedUpToDate: { type: "date" },
              lastSummarizedAt: { type: "date" },
            },
          },
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
        dynamic: false,
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

  /**
   * Ensures the Conversations Index exists with 2026 Semantic Text capabilities.
   */
  private async ensureConversationsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.CONVERSATIONS_INDEX,
    });

    if (exists) {
      return;
    }

    await this.client.indices.create({
      index: this.CONVERSATIONS_INDEX,
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,
        "index.sort.field": ["conversationId", "createdAt"],
        "index.sort.order": ["asc", "asc"],
      },
      mappings: {
        dynamic: "strict",
        properties: {
          messageId: { type: "keyword" },
          conversationId: { type: "keyword" },
          userId: { type: "keyword" },
          role: { type: "keyword" },
          content: { type: "text" },
          status: { type: "keyword" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
          completedAt: { type: "date" },

          metadata: {
            type: "object",
            dynamic: true,
          },

          toolCalls: {
            type: "nested",
            properties: {
              toolName: { type: "keyword" },
              input: { type: "object", enabled: false },
              output: { type: "object", enabled: false },
              status: { type: "keyword" },
            },
          },

          sources: {
            type: "nested",
            properties: {
              type: { type: "keyword" },
              emailId: { type: "keyword" },
              snippet: { type: "text" },
              metadata: { type: "object", enabled: false },
            },
          },

          embeddings: {
            type: "dense_vector",
            dims: 1536,
            index: true,
            similarity: "cosine",
          },
        },
      },
    });
  }

  private async ensureConversationSummariesIndex(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: this.CONVERSATION_SUMMARIES_INDEX,
    });
    if (exists) return;

    await this.client.indices.create({
      index: this.CONVERSATION_SUMMARIES_INDEX,
      mappings: {
        properties: {
          conversationId: { type: "keyword" },
          userId: { type: "keyword" },
          title: { type: "text", fields: { keyword: { type: "keyword" } } },
          summary: { type: "text" },
          lastMessageAt: { type: "date" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
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

  async searchEmails(params: {
    emailAddresses: string[];
    query: string;
    queryEmbedding?: number[]; // caller generates this — keeps ES service pure
    size?: number;
    page?: number;
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
    const {
      emailAddresses,
      query,
      queryEmbedding,
      size = 20,
      page = 0,
      filters = {},
    } = params;

    const trimmed = query.trim();
    const mustFilters = this.buildMustFilters(emailAddresses, filters);
    const sourceExcludes = ["embedding", "searchText", "bodyHtml", "bodyText"];

    // ── No query — plain filtered list, no scoring needed ─────────────────────
    if (!trimmed) {
      return this.plainFilteredSearch({
        mustFilters,
        sourceExcludes,
        size,
        page,
      });
    }


    const emailQuery = this.buildHybridEmailQuery({
      trimmed,
      queryEmbedding,
      mustFilters,
      sourceExcludes,
      size,
      page,
    });

    const { responses } = await this.client.msearch({
      searches: [
        // ── [0] Notes search ──────────────────────────────────────────────────
        { index: this.THREADS_INDEX },
        {
          size: 50,
          _source: ["threadId"],
          query: {
            match: {
              notes: { query: trimmed, operator: "or", fuzziness: "AUTO" },
            },
          },
        },

        // ── [1] Hybrid email search ───────────────────────────────────────────
        { index: this.EMAILS_INDEX },
        emailQuery,
      ],
    });

    const noteThreadIds = this.extractNoteThreadIds(responses[0]);
    return this.parseHybridEmailResponse({
      response: responses[1],
      noteThreadIds,
      size,
      page,
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private buildMustFilters(
    emailAddresses: string[],
    filters: NonNullable<Parameters<typeof this.searchEmails>[0]["filters"]>,
  ): object[] {
    const must: object[] = [
      { terms: { emailAddress: emailAddresses } },
      { term: { isDeleted: false } },
    ];

    const termFilter = (field: string, value: unknown) =>
      must.push({ term: { [field]: value } });

    if (filters.isRead !== undefined) termFilter("isRead", filters.isRead);
    if (filters.isStarred !== undefined)
      termFilter("isStarred", filters.isStarred);
    if (filters.isArchived !== undefined)
      termFilter("isArchived", filters.isArchived);
    if (filters.hasAttachments !== undefined)
      termFilter("hasAttachments", filters.hasAttachments);
    if (filters.from) termFilter("from.email", filters.from.toLowerCase());
    if (filters.labels?.length)
      must.push({ terms: { labels: filters.labels } });

    if (filters.to) {
      must.push({
        nested: {
          path: "to",
          query: { term: { "to.email": filters.to.toLowerCase() } },
        },
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      must.push({
        range: {
          receivedAt: {
            ...(filters.dateFrom && { gte: filters.dateFrom }),
            ...(filters.dateTo && { lte: filters.dateTo }),
          },
        },
      });
    }

    return must;
  }

  private buildHybridEmailQuery({
    trimmed,
    queryEmbedding,
    mustFilters,
    sourceExcludes,
    size,
    page,
  }: {
    trimmed: string;
    queryEmbedding?: number[];
    mustFilters: object[];
    sourceExcludes: string[];
    size: number;
    page: number;
  }): object {
    const highlight = {
      fields: {
        subject: {
          number_of_fragments: 0,
          pre_tags: ["<mark>"],
          post_tags: ["</mark>"],
        },
        snippet: {
          number_of_fragments: 1,
          fragment_size: 150,
          pre_tags: ["<mark>"],
          post_tags: ["</mark>"],
        },
      },
    };

    const lexicalRetriever = {
      standard: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    { match_phrase: { subject: { query: trimmed, boost: 4 } } },
                    {
                      multi_match: {
                        query: trimmed,
                        fields: ["subject^3", "snippet^1.5", "from.email"],
                        type: "best_fields",
                        operator: "or",
                        fuzziness: "AUTO",
                        boost: 2,
                      },
                    },
                    {
                      multi_match: {
                        query: trimmed,
                        fields: ["subject^2", "snippet"],
                        type: "phrase_prefix",
                        boost: 1.5,
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
      },
    };

    // No embedding available — lexical only, no kNN overhead
    if (!queryEmbedding) {
      return {
        size,
        from: page * size,
        _source: { excludes: sourceExcludes },
        retriever: { standard: lexicalRetriever.standard },
        highlight,
      };
    }

    // Hybrid RRF — k and rank_window_size sized to 2x page, let BBQ manage num_candidates
    return {
      size,
      from: page * size,
      _source: { excludes: sourceExcludes },
      retriever: {
        rrf: {
          retrievers: [
            lexicalRetriever,
            {
              knn: {
                field: "embedding",
                query_vector: queryEmbedding,
                k: size * 2, // reasonable fusion net
                filter: mustFilters, // security enforced on kNN path too
              }, // num_candidates omitted — ES BBQ defaults are optimal
            },
          ],
          rank_window_size: size * 2,
          rank_constant: 60,
        },
      },
      highlight,
    };
  }

  private extractNoteThreadIds(response: unknown): Set<string> {
    const noteSet = new Set<string>();
    if (!response || typeof response !== "object" || !("hits" in response))
      return noteSet;

    for (const h of (response as any).hits.hits) {
      const tid = (h._source as { threadId?: string })?.threadId;
      if (tid) noteSet.add(tid);
    }

    return noteSet;
  }

  private parseHybridEmailResponse({
    response,
    noteThreadIds,
    size,
    page,
  }: {
    response: unknown;
    noteThreadIds: Set<string>;
    size: number;
    page: number;
  }) {
    if (!response || typeof response !== "object" || !("hits" in response)) {
      return { emails: [], total: 0, page, nextPage: null };
    }

    const resp = response as any;
    const hits = resp.hits.hits;
    const NOTE_BOOST = 3;

    const emails = hits
      .map((hit: any) => {
        const src = hit._source as UnifiedEmailDocument;
        const score =
          (hit._score ?? 0) +
          (noteThreadIds.has(src.threadId) ? NOTE_BOOST : 0);

        return {
          score,
          id: hit._id,
          threadId: src.threadId,
          subject: hit.highlight?.subject?.[0] ?? src.subject,
          snippet: hit.highlight?.snippet?.[0] ?? src.snippet,
          receivedAt: src.receivedAt,
          from: src.from,
          to: src.to,
          isRead: src.isRead,
          isStarred: src.isStarred,
          isArchived: src.isArchived,
          hasAttachments: src.hasAttachments,
          labels: src.labels,
          emailAddress: src.emailAddress,
          provider: src.provider,
        };
      })
      .sort((a: any, b: any) => b.score - a.score);

    return {
      emails,
      total: (resp.hits.total as { value: number }).value,
      page,
      nextPage: hits.length === size ? page + 1 : null,
    };
  }

  private async plainFilteredSearch({
    mustFilters,
    sourceExcludes,
    size,
    page,
  }: {
    mustFilters: object[];
    sourceExcludes: string[];
    size: number;
    page: number;
  }) {
    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size,
      from: page * size,
      _source: { excludes: sourceExcludes },
      query: { bool: { filter: mustFilters } },
      sort: [{ receivedAt: { order: "desc" } }],
    });

    const hits = result.hits.hits;

    return {
      emails: hits.map((hit) => {
        const src = hit._source as UnifiedEmailDocument;
        return {
          score: 0,
          id: hit._id,
          threadId: src.threadId,
          subject: src.subject,
          snippet: src.snippet,
          receivedAt: src.receivedAt,
          from: src.from,
          to: src.to,
          isRead: src.isRead,
          isStarred: src.isStarred,
          isArchived: src.isArchived,
          hasAttachments: src.hasAttachments,
          labels: src.labels,
          emailAddress: src.emailAddress,
          provider: src.provider,
        };
      }),
      total: (result.hits.total as { value: number }).value,
      page,
      nextPage: hits.length === size ? page + 1 : null,
    };
  }
  /**
   * Top level thread Emails
   */

  async getInboxThreads(params: {
    emailAddresses: string[];
    size?: number;
    page?: number;
    folder?: string;
  }) {
    const { emailAddresses, size = 20, page = 0, folder = "inbox" } = params;

    const SYSTEM_LABELS = new Set([
      "inbox",
      "sent",
      "starred",
      "important",
      "draft",
      "drafts",
      "unread",
      "archived",
      "spam",
      "trash",
      "all",
    ]);

    const folderFilter = () => {
      const lower = folder.toLowerCase();
      const upper = folder.toUpperCase();

      switch (lower) {
        case "starred":
          return { term: { isStarred: true } };
        case "archived":
          return { term: { isArchived: true } };
        case "drafts":
          return { term: { isDraft: true } };
        case "unread":
          return { term: { isRead: false } };
        default:
          return {
            terms: {
              labels: [
                lower,
                upper,
                folder.charAt(0).toUpperCase() + folder.slice(1).toLowerCase(),
              ],
            },
          };
      }
    };

    const lower = folder.toLowerCase();

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size,
      from: page * size,
      query: {
        bool: {
          filter: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
            folderFilter(),
          ],
          // Only exclude archived + drafts from inbox; all other folders show everything
          ...(lower === "inbox"
            ? {
                must_not: [
                  { term: { isArchived: true } },
                  { term: { isDraft: true } },
                ],
              }
            : {}),
        },
      },
      sort: [{ receivedAt: "desc" }],
      collapse: {
        field: "threadId",
        inner_hits: [
          {
            name: "thread_state",
            size: 10,
            _source: ["isRead", "isStarred", "labels"],
          },
        ],
      },
    });

    const hits = result.hits.hits;

    return {
      threads: hits.map((hit) => {
        const source = hit._source as UnifiedEmailDocument;
        const states = hit.inner_hits?.thread_state?.hits.hits ?? [];

        return {
          threadId: source.threadId,
          lastEmailId: hit._id,
          lastMessageId: source.providerMessageId,
          subject: source.subject,
          receivedAt: source.receivedAt,
          emailAddress: source.emailAddress,
          from: source.from,
          isArchived: source.isArchived,
          isDraft: source.isDraft,
          snoozedUntil: source.snoozeUntil,
          to: source.to,
          provider: source.provider,
          isUnread: states.some((s) => s._source?.isRead === false),
          isStarred: states.some((s) => s._source?.isStarred === true),
          labels: [
            ...new Set(
              states.flatMap((s) =>
                (s._source?.labels ?? []).map((l: string) => l.toLowerCase()),
              ),
            ),
          ].filter((l) => !SYSTEM_LABELS.has(l)),
        };
      }),

      nextPage: hits.length === size ? page + 1 : null,
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
      size: 100,
      _source: {
        excludes: ["embedding", "attachments"],
      },
      query: {
        bool: {
          filter: [
            { term: { threadId } },
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
          ],
        },
      },
      sort: [{ receivedAt: "asc" }],
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
        drafts: {
          filter: { term: { isDraft: true } },
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
        drafts: aggs.drafts.doc_count,
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
    page?: number;
  }) {
    const { emailAddresses, size = 20, page = 0 } = params;

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size,
      from: page * size,
      _source: {
        excludes: ["searchText", "embedding", "attachments"],
      },
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
          ],
          minimum_should_match: 1,
        },
      },
      sort: [{ receivedAt: "desc" }],
    });

    const hits = result.hits.hits;

    return {
      emails: hits.map((hit) => hit._source as UnifiedEmailDocument),
      total: (result.hits.total as any).value,
      nextPage: hits.length === size ? page + 1 : null,
    };
  }

  /**
   * Update inbox state for emails
   */
  async updateInboxState(params: {
    provider: string;
    providerMessageIds: string[];
    inboxState: "INBOX" | "ARCHIVED" | "SNOOZED" | "DONE" | "DRAFT";
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

  // --------------------
  // EMAIL OPERATIONS (Generic - handles drafts too)
  // --------------------

  async saveDraft(draft: UnifiedEmailDocument): Promise<void> {
    const compositeId = `${draft.provider}_${draft.providerMessageId}`;
    await this.client.index({
      index: this.EMAILS_INDEX,
      id: compositeId,
      document: draft,
    });
  }

  async getEmailById(
    id: string,
    emailAddresses?: string[],
  ): Promise<UnifiedEmailDocument | null> {
    try {
      const result = await this.client.get({
        index: this.EMAILS_INDEX,
        id,
      });

      const email = result._source as UnifiedEmailDocument;

      // Verify ownership if emailAddresses provided
      if (emailAddresses && !emailAddresses.includes(email.emailAddress)) {
        return null;
      }

      return email;
    } catch (error) {
      return null;
    }
  }

  async upsertEmailWithEmbedding(
    id: string,
    embedding: number[],
  ): Promise<void> {
    await this.client.update({
      index: this.EMAILS_INDEX,
      id,
      doc: {
        embedding,
      },
      doc_as_upsert: true,
    });
  }

  async updateEmail(
    id: string,
    updates: Partial<UnifiedEmailDocument>,
  ): Promise<void> {
    const updateDoc: any = { ...updates };

    // If updating a draft, update lastEditedAt
    if (updates.isDraft !== false) {
      updateDoc["draftData.lastEditedAt"] = new Date().toISOString();
    }

    await this.client.update({
      index: this.EMAILS_INDEX,
      id,
      doc: updateDoc,
    });
  }

  async deleteEmail(id: string): Promise<void> {
    await this.client.delete({
      index: this.EMAILS_INDEX,
      id,
    });
  }

  // --------------------
  // ANALYTICS OPERATIONS
  // --------------------

  async getAnalyticsOverview(
    emailAddresses: string[],
    period: "daily" | "weekly" | "monthly",
  ): Promise<import("./interface").AnalyticsOverview> {
    const dateRange = this.getDateRange(period);

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  { terms: { "to.email": emailAddresses } },
                  { terms: { "from.email": emailAddresses } },
                ],
              },
            },
            {
              range: { receivedAt: { gte: dateRange.from, lte: dateRange.to } },
            },
            { term: { isDraft: false } }, // Exclude drafts
          ],
        },
      },
      size: 0,
      aggs: {
        received: {
          filter: { terms: { "to.email": emailAddresses } },
        },
        sent: {
          filter: { terms: { "from.email": emailAddresses } },
        },
        read: {
          filter: {
            bool: {
              must: [
                { terms: { "to.email": emailAddresses } },
                { term: { isRead: true } },
              ],
            },
          },
        },
        archived: {
          filter: {
            bool: {
              must: [
                { terms: { emailAddress: emailAddresses } },
                { term: { inboxState: "ARCHIVED" } },
              ],
            },
          },
        },
        deleted: {
          filter: {
            bool: {
              must: [
                { terms: { emailAddress: emailAddresses } },
                { term: { isDeleted: true } },
              ],
            },
          },
        },
        starred: {
          filter: {
            bool: {
              must: [
                { terms: { emailAddress: emailAddresses } },
                { term: { isStarred: true } },
              ],
            },
          },
        },
      },
    });

    const aggs = result.aggregations as any;
    const receivedCount = aggs.received.doc_count;
    const readCount = aggs.read.doc_count;

    return {
      period,
      dateRange,
      metrics: {
        received: receivedCount,
        sent: aggs.sent.doc_count,
        read: readCount,
        readRate: receivedCount > 0 ? (readCount / receivedCount) * 100 : 0,
        archived: aggs.archived.doc_count,
        deleted: aggs.deleted.doc_count,
        starred: aggs.starred.doc_count,
      },
    };
  }

  async getTimePatterns(
    emailAddresses: string[],
    period: "weekly" | "monthly",
  ): Promise<import("./interface").TimePatterns> {
    const dateRange = this.getDateRange(period);

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      query: {
        bool: {
          must: [
            { terms: { emailAddress: emailAddresses } },
            {
              range: { receivedAt: { gte: dateRange.from, lte: dateRange.to } },
            },
            { term: { isDraft: false } },
          ],
        },
      },
      size: 0,
      aggs: {
        by_hour: {
          date_histogram: {
            field: "receivedAt",
            calendar_interval: "hour",
            format: "H",
          },
        },
        by_day: {
          date_histogram: {
            field: "receivedAt",
            calendar_interval: "day",
            format: "EEEE",
          },
        },
      },
    });

    const hourlyBuckets = (result.aggregations?.by_hour as any)?.buckets || [];
    const dailyBuckets = (result.aggregations?.by_day as any)?.buckets || [];

    // Process hourly distribution
    const hourlyDistribution: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i.toString()] = 0;
    }
    hourlyBuckets.forEach((bucket: any) => {
      const hour = bucket.key_as_string;
      hourlyDistribution[hour] =
        (hourlyDistribution[hour] || 0) + bucket.doc_count;
    });

    // Process daily distribution
    const dailyDistribution: Record<string, number> = {};
    dailyBuckets.forEach((bucket: any) => {
      const day = bucket.key_as_string;
      dailyDistribution[day] = (dailyDistribution[day] || 0) + bucket.doc_count;
    });

    // Find peak hours
    const peakHours = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        label: `${hour}:00`,
      }));

    // Find busiest and quietest days
    const sortedDays = Object.entries(dailyDistribution).sort(
      ([, a], [, b]) => b - a,
    );
    const busiestDay = sortedDays[0]?.[0] || "N/A";
    const quietestDay = sortedDays[sortedDays.length - 1]?.[0] || "N/A";

    // Calculate average emails per hour for different time periods
    const avgEmailsPerHour: Record<string, number> = {
      "9-12": this.calculateAvgForHours(hourlyDistribution, 9, 12),
      "12-17": this.calculateAvgForHours(hourlyDistribution, 12, 17),
      "17-22": this.calculateAvgForHours(hourlyDistribution, 17, 22),
    };

    return {
      hourlyDistribution,
      dailyDistribution,
      peakHours,
      busiestDay,
      quietestDay,
      avgEmailsPerHour,
    };
  }

  private getDateRange(period: "daily" | "weekly" | "monthly"): {
    from: string;
    to: string;
  } {
    const now = new Date();
    const to = now.toISOString();
    let from: Date;

    switch (period) {
      case "daily":
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return { from: from.toISOString(), to };
  }

  private calculateAvgForHours(
    hourlyDistribution: Record<string, number>,
    startHour: number,
    endHour: number,
  ): number {
    let total = 0;
    let count = 0;
    for (let i = startHour; i < endHour; i++) {
      total += hourlyDistribution[i.toString()] || 0;
      count++;
    }
    return count > 0 ? Math.round(total / count) : 0;
  }

  /**
   * Get all emails from a specific sender
   * Sorted by receivedAt descending (latest first)
   */
  async getEmailsFromSender(params: {
    emailAddresses: string[];
    senderEmail: string;
    size?: number;
    page?: number;
  }) {
    const { emailAddresses, senderEmail, size = 20, page = 0 } = params;

    const result = await this.client.search({
      index: this.EMAILS_INDEX,
      size,
      from: page * size,
      _source: {
        excludes: [
          "bodyText",
          "bodyHtml",
          "searchText",
          "embedding",
          "attachments",
        ],
      },
      query: {
        bool: {
          filter: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
          ],
          // Emails either sent by OR received from this address
          should: [
            { term: { "from.email": senderEmail.toLowerCase() } },
            {
              nested: {
                path: "to",
                query: { term: { "to.email": senderEmail.toLowerCase() } },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      sort: [{ receivedAt: "desc" }],
    });

    const hits = result.hits.hits;

    return {
      emails: hits.map((hit) => ({
        ...(hit._source as UnifiedEmailDocument),
        id: hit._id as string,
      })),
      total: (result.hits.total as any).value,
      nextPage: hits.length === size ? page + 1 : null,
    };
  }

  /**
   * Get email suggestions (recipients from sent emails)
   * Can filter by query string (matches name or email)
   */
  async getEmailSuggestions(params: {
    emailAddresses: string[];
    query?: string;
    limit?: number;
  }) {
    const { emailAddresses, query, limit = 10 } = params;

    const mustConditions: any[] = [];

    if (query) {
      const q = query.toLowerCase();
      mustConditions.push({
        bool: {
          should: [
            // Match against to recipients
            {
              nested: {
                path: "to",
                query: {
                  bool: {
                    should: [
                      { wildcard: { "to.email": `*${q}*` } },
                      { match_phrase_prefix: { "to.name": query } },
                    ],
                  },
                },
              },
            },
            // Match against from sender
            { wildcard: { "from.email": `*${q}*` } },
            { match_phrase_prefix: { "from.name": query } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    const res = await this.client.search({
      index: this.EMAILS_INDEX,
      size: 1000,
      query: {
        bool: {
          filter: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isDraft: false } },
            { term: { isDeleted: false } },
          ],
          must: mustConditions.length > 0 ? mustConditions : undefined,
        },
      },
      sort: [{ receivedAt: "desc" }],
      _source: ["to", "from", "receivedAt", "sentAt"],
    });

    // Aggregate unique contacts by email (both to recipients and from senders)
    const recipientMap = new Map<
      string,
      { email: string; name: string; lastUsed: string }
    >();

    const addContact = (contact: any, date: string) => {
      if (contact?.email && !recipientMap.has(contact.email)) {
        // Skip our own addresses
        if (!emailAddresses.includes(contact.email)) {
          recipientMap.set(contact.email, {
            email: contact.email,
            name: contact.name || "",
            lastUsed: date,
          });
        }
      }
    };

    res.hits.hits.forEach((hit: any) => {
      const doc = hit._source;
      const date = doc.sentAt || doc.receivedAt || "";

      // Collect to recipients
      const toList = Array.isArray(doc.to) ? doc.to : doc.to ? [doc.to] : [];
      toList.forEach((r: any) => addContact(r, date));

      // Collect from sender
      if (doc.from) addContact(doc.from, date);
    });

    const suggestions = Array.from(recipientMap.values()).slice(0, limit);

    return {
      suggestions,
      total: suggestions.length,
    };
  }
}
