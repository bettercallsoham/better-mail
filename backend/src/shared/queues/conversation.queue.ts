import { Queue } from "bullmq";
import { redis } from "../config/redis";

interface ProcessConversationMessageJob {
  conversationId: string;
  userId: string;
  messageId: string;
  messageContent: string;
}

export const conversationQueue = new Queue<ProcessConversationMessageJob>(
  "conversation-queue",
  {
    connection: redis as any,
    defaultJobOptions: {
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 3600, // Keep for 24 hours
      },
      removeOnFail: {
        count: 500, // Keep last 500 failed jobs for debugging
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  },
);

/**
 * Add a conversation message processing job to the queue
 */
export const addConversationMessageJob = async (
  data: ProcessConversationMessageJob,
) => {
  return await conversationQueue.add("process-conversation-message", data);
};
