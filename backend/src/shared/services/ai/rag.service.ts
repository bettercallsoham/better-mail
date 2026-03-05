import { EmbeddingsService } from "./embeddings.service";
import {
  SearchHit,
  VectorSearchService,
} from "../elastic/vector-search.service";
import { UnifiedEmailDocument } from "../elastic/interface";
import { getUserEmails } from "../../../apis/utils/email-helper";

export interface RAGResponse {
  context: string;
  raw: {
    emails: any[];
    conversations: any[];
  };
}

export class RAGService {
  constructor(
    private embeddingsService: EmbeddingsService,
    private vectorSearchService: VectorSearchService,
  ) {}

  async getUnifiedContext(
    query: string,
    userId: string,
    currentConvId: string,
  ): Promise<RAGResponse> {
    const queryVector = await this.embeddingsService.generate(query);

    const { emails: verifiedEmails } = await getUserEmails(userId);

    const [emailHits, chatHits] = await Promise.all([
      this.searchEmails(query, queryVector, verifiedEmails),
      this.searchConversations(query, queryVector, userId, currentConvId),
    ]);

    // 4. Construct Context
    const context = [
      "RELEVANT EMAIL DATA: ",
      emailHits.length > 0
        ? this.formatEmails(emailHits)
        : "No relevant emails found.",
      "\nRELEVANT PAST CHAT HISTORY : ",
      chatHits.length > 0
        ? this.formatChats(chatHits)
        : "No relevant past conversations found.",
    ].join("\n");

    return {
      context,
      raw: { emails: emailHits, conversations: chatHits },
    };
  }

  private async searchEmails(
    query: string,
    vector: number[],
    verifiedEmails: string[],
  ) {
    return this.vectorSearchService.hybridSearch<UnifiedEmailDocument>({
      index: "emails_v1",
      queryText: query,
      queryVector: vector,
      filterMust: [
        { terms: { emailAddress: verifiedEmails } },
        { term: { isDeleted: false } },
      ],
      k: 5,
    });
  }

  private async searchConversations(
    query: string,
    vector: number[],
    userId: string,
    excludeId: string,
  ) {
    return this.vectorSearchService.hybridSearch<any>({
      index: "conversations_v1",
      queryText: query,
      queryVector: vector,
      filterMust: [
        { term: { userId: userId } },
        { bool: { must_not: { term: { conversationId: excludeId } } } },
      ],
      k: 3,
    });
  }

  private formatEmails(hits: SearchHit<UnifiedEmailDocument>[]): string {
    return hits
      .map((h, i) => {
        const src = h._source;
        const fullBody: string = src.bodyText || src.snippet || "";
        const bodyExcerpt =
          fullBody.length > 800 ? fullBody.slice(0, 800) + "…" : fullBody;
        const labels = src.labels?.length ? src.labels.join(", ") : undefined;

        return (
          `Email ${i + 1} [Score: ${h._score.toFixed(2)}] [emailId: ${h._id}]:\n` +
          `From: ${src.from.email}${src.from.name ? ` (${src.from.name})` : ""} | Subject: ${src.subject}\n` +
          `Date: ${src.receivedAt}${labels ? ` | Labels: ${labels}` : ""}\n` +
          `Body: ${bodyExcerpt || "(no body)"}\n---`
        );
      })
      .join("\n");
  }

  private formatChats(hits: SearchHit<any>[]): string {
    return hits
      .map(
        (h) =>
          `[Past Chat ${h._source.conversationId.slice(0, 6)}] ${h._source.role}: ${h._source.content}`,
      )
      .join("\n");
  }
}
