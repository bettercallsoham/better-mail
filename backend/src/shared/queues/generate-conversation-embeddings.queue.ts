import { Queue } from "bullmq";
import { redis } from "../config/redis";

interface GenerateConversationEmbeddingsJob {
  conversationId: string;
  userId: string;
  messageIds: string[]; // Batch multiple messages for efficiency
}

export const conversationEmbeddingsQueue = new Queue<GenerateConversationEmbeddingsJob>(
  "conversation-embeddings-queue",
  {
    connection: redis as any,
    defaultJobOptions: {
      removeOnComplete: {
        count: 50, 
        age: 24 * 3600, 
      },
      removeOnFail: {
        count: 200, 
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, 
      },
    },
  },
);

/**
 * Add a conversation embeddings generation job to the queue
 */
export const addConversationEmbeddingsJob = async (
  data: GenerateConversationEmbeddingsJob,
) => {
  return await conversationEmbeddingsQueue.add("generate-conversation-embeddings", data);
};