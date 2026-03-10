import { Queue } from "bullmq";
import { redis } from "../config/redis";

export interface SummarizationJobData {
  emailAddress: string;
  provider: string;
  providerMessageId: string;
  threadId: string;

  sanitizedText: string;

  subject: string;
  fromEmail: string;
  fromName?: string;
  receivedAt: string;
}

export const summarizationQueue = new Queue<SummarizationJobData>(
  "generate-summary",
  {
    connection: redis as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  },
);
