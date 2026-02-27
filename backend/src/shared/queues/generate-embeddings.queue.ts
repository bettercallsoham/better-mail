import { Queue } from "bullmq";
import { redis } from "../config/redis";

export interface EmbeddingJobData {
  emailAddress?: string;
  provider: "gmail" | "outlook";
  providerMessageId: string;
}

export const embeddingsQueue = new Queue<EmbeddingJobData>(
  "generate-embeddings",
  {
    connection: redis as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    },
  },
);
