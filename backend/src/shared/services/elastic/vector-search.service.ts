import { Client, estypes } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";

/**
 * Updated types for Basic License Hybrid Search
 */
export interface HybridSearchParams {
  index: string;
  queryText: string;
  queryVector: number[];
  filterMust: estypes.QueryDslQueryContainer[];
  k: number;
  // Using Boosts instead of Weights for Standard Bool query
  semanticBoost?: number;
  lexicalBoost?: number;
}

export interface SearchHit<T> {
  _id: string;
  _score: number;
  _source: T;
}

export class VectorSearchService {
  constructor(private readonly client: Client) {}

  async hybridSearch<T>(params: HybridSearchParams): Promise<SearchHit<T>[]> {
    const {
      index,
      queryText,
      queryVector,
      filterMust,
      k,
      semanticBoost = 1.0, // kNN scores are usually 0-1
      lexicalBoost = 0.5, // BM25 scores can be > 10, so we dampen them
    } = params;

    try {
      // Basic License compliant Hybrid Search using the bool + knn pattern
      const response = await this.client.search<T>({
        index,
        size: k,
        query: {
          bool: {
            // 1. Mandatory Filters (Security & Permissions)
            filter: filterMust,

            // 2. The Hybrid "Should" block
            should: [
              {
                // Lexical Branch: Using the centralized searchText field we optimized
                match: {
                  searchText: {
                    query: queryText,
                    boost: lexicalBoost,
                  },
                },
              },
              {
                // Semantic Branch: kNN as a query clause
                knn: {
                  field: index === "emails_v1" ? "embedding" : "embeddings",
                  query_vector: queryVector,
                  k: k,
                  num_candidates: Math.max(k * 10, 100),
                  boost: semanticBoost,
                  // We also apply filter inside knn for HNSW traversal optimization
                  filter: filterMust,
                },
              },
            ],
            // Ensures at least one branch matches
            minimum_should_match: 1,
          },
        },
      });

      return response.hits.hits as unknown as SearchHit<T>[];
    } catch (error) {
      logger.error(`Standard Hybrid search failed on index [${index}]:`, {
        error: (error as Error).message,
        query: queryText,
      });
      throw error;
    }
  }
}
