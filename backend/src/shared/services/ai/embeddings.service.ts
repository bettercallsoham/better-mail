import {
  embeddingsClient,
  EMBEDDINGS_MODEL_DEPLOYMENT,
} from "../../config/llm";
import { logger } from "../../utils/logger";

export class EmbeddingsService {
  /**
   * Generate embedding vector for a single text
   */
  async generate(text: string): Promise<number[]> {
    try {
      const response = await embeddingsClient.embeddings.create({
        model: EMBEDDINGS_MODEL_DEPLOYMENT!,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error("Failed to generate embedding:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch (more efficient)
   */
  async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await embeddingsClient.embeddings.create({
        model: EMBEDDINGS_MODEL_DEPLOYMENT!,
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      logger.error("Failed to generate batch embeddings:", {
        error: (error as Error).message,
        count: texts.length,
      });
      throw error;
    }
  }
}
