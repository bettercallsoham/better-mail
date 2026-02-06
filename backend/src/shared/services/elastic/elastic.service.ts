import { Client } from "@elastic/elasticsearch";

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
          mailboxId: { type: "keyword" },
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

          inboxState: { type: "keyword" },
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
          mailboxId: { type: "keyword" },

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
}
