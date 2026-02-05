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

export const webhookWorker = new Worker<WebhookData>(
  "webhook-processing",
  async (job: Job<WebhookData>) => {
    logger.info(`Processing webhook event: ${job.data.event}`);
    
    try {
      const { event, payload, source } = job.data;
      
      // Add your webhook processing logic here
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      logger.info(`Successfully processed webhook: ${event}`);
      return { success: true, event };
    } catch (error) {
      logger.error(`Failed to process webhook: ${error}`);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 10,
  }
);

webhookWorker.on("completed", (job) => {
  logger.info(`Webhook job ${job.id} completed`);
});

webhookWorker.on("failed", (job, err) => {
  logger.error(`Webhook job ${job?.id} failed: ${err.message}`);
});
