import {
  embeddingsClient,
  EMBEDDINGS_MODEL_DEPLOYMENT,
} from "../../config/llm";
import { VectorSearchService } from "../elastic/vector-search.service";
import { UnifiedEmailDocument } from "../elastic/interface";
import { logger } from "../../utils/logger";

interface SearchFilters {
  emailAddresses: string[];
  dateFrom?: string;
  dateTo?: string;
  from?: string;
  labels?: string[];
}

interface SearchResult {
  email: UnifiedEmailDocument;
  score: number;
}

export class EmbeddingsService {
  constructor(private vectorSearchService: VectorSearchService) {}

  /**
   * Generate embedding for user's query
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await embeddingsClient.embeddings.create({
        model: EMBEDDINGS_MODEL_DEPLOYMENT!,
        input: query,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error("Failed to generate query embedding:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search for similar emails using vector similarity
   */
  async searchSimilarEmails(
    queryVector: number[],
    filters: SearchFilters,
    k: number = 10,
  ): Promise<SearchResult[]> {
    const { emailAddresses, dateFrom, dateTo, from, labels } = filters;

    // Build filter query
    const must: any[] = [
      { terms: { emailAddress: emailAddresses } },
      { term: { isDeleted: false } },
    ];

    if (dateFrom || dateTo) {
      const dateRange: any = {};
      if (dateFrom) dateRange.gte = dateFrom;
      if (dateTo) dateRange.lte = dateTo;
      must.push({ range: { receivedAt: dateRange } });
    }

    if (from) {
      must.push({ term: { "from.email": from } });
    }

    if (labels && labels.length > 0) {
      must.push({ terms: { labels } });
    }

    try {
      const result = await this.vectorSearchService.vectorSearch({
        queryVector,
        filters: { must },
        k,
        numCandidates: k * 10, // For better accuracy
      });

      return result.map((hit: any) => ({
        email: hit._source as UnifiedEmailDocument,
        score: hit._score || 0,
      }));
    } catch (error) {
      logger.error("Vector search failed:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Format emails into context for RAG
   */
  formatEmailContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return "No relevant emails found.";
    }

    const formattedEmails = results.map((result, idx) => {
      const email = result.email;
      const date = new Date(email.receivedAt).toLocaleDateString();

      return `
Email ${idx + 1} (Relevance: ${(result.score * 100).toFixed(1)}%):
From: ${email.from.name || email.from.email}
To: ${email.to.map((t) => t.name || t.email).join(", ")}
Date: ${date}
Subject: ${email.subject}
Content: ${email.bodyText?.slice(0, 500) || email.snippet || "No content"}
${email.bodyText && email.bodyText.length > 500 ? "..." : ""}
---`.trim();
    });

    return formattedEmails.join("\n\n");
  }

  /**
   * Complete RAG search: query → embedding → search → format
   */
  async searchAndFormatContext(
    query: string,
    filters: SearchFilters,
    k: number = 5,
  ): Promise<{ context: string; results: SearchResult[] }> {
    logger.info(`RAG search for query: "${query.slice(0, 50)}..."`);

    const queryVector = await this.generateQueryEmbedding(query);
    const results = await this.searchSimilarEmails(queryVector, filters, k);
    const context = this.formatEmailContext(results);

    logger.info(`Found ${results.length} relevant emails`);

    return { context, results };
  }
}
