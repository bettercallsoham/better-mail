import { Client } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";
import { UnifiedEmailDocument } from "./interface";

interface VectorSearchParams {
  queryVector: number[];
  filters: {
    must?: any[];
    should?: any[];
  };
  k: number;
  numCandidates?: number;
}

export class VectorSearchService {
  private readonly client: Client;
  private readonly EMAILS_INDEX = "emails_v1";

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Perform kNN vector search on email embeddings
   */
  async vectorSearch(params: VectorSearchParams): Promise<any[]> {
    const { queryVector, filters, k, numCandidates = k * 10 } = params;

    try {
      const response = await this.client.search({
        index: this.EMAILS_INDEX,
        size: k,
        query: {
          bool: {
            must: [
              {
                knn: {
                  field: "embedding",
                  query_vector: queryVector,
                  k,
                  num_candidates: numCandidates,
                },
              },
              ...(filters.must || []),
            ],
            should: filters.should || [],
          },
        },
        _source: true,
      });

      return response.hits.hits;
    } catch (error) {
      logger.error("Vector search failed:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Hybrid search: combines vector similarity + keyword search
   */
  async hybridSearch(params: {
    queryVector: number[];
    queryText: string;
    filters: { must?: any[] };
    k: number;
  }): Promise<any[]> {
    const { queryVector, queryText, filters, k } = params;

    try {
      const response = await this.client.search({
        index: this.EMAILS_INDEX,
        size: k,
        query: {
          bool: {
            must: filters.must || [],
            should: [
              {
                knn: {
                  field: "embedding",
                  query_vector: queryVector,
                  k,
                  num_candidates: k * 10,
                  boost: 1.5, // Prefer semantic similarity
                },
              },
              {
                multi_match: {
                  query: queryText,
                  fields: ["subject^3", "bodyText^2", "searchText"],
                  type: "best_fields",
                  boost: 1.0, // Keyword match
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        _source: true,
      });

      return response.hits.hits;
    } catch (error) {
      logger.error("Hybrid search failed:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find similar emails to a given email (for "find similar" feature)
   */
  async findSimilarEmails(
    emailId: string,
    emailAddresses: string[],
    k: number = 5,
  ): Promise<UnifiedEmailDocument[]> {
    try {
      // First, get the email's embedding
      const emailDoc = await this.client.get({
        index: this.EMAILS_INDEX,
        id: emailId,
        _source: ["embedding"],
      });

      const embedding = (emailDoc._source as any)?.embedding;

      if (!embedding) {
        throw new Error("Email has no embedding");
      }

      // Search for similar emails
      const results = await this.vectorSearch({
        queryVector: embedding,
        filters: {
          must: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isDeleted: false } },
          ],
        },
        k: k + 1, // +1 because we'll filter out the original email
      });

      return results
        .filter((hit: any) => hit._id !== emailId) // Exclude the original email
        .slice(0, k)
        .map((hit: any) => hit._source as UnifiedEmailDocument);
    } catch (error) {
      logger.error("Find similar emails failed:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
