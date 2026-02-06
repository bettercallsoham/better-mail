import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

interface WebhookData {
  event: string;
  payload: Record<string, any>;
  source: string;
}

export const webhookQueue = new Queue<WebhookData>("webhook-processing", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  },
});
