import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

interface OutlookSyncData {
  accountId: string;
  email: string;
  deltaToken?: string;
  fullSync?: boolean;
}

export const outlookSyncQueue = new Queue<OutlookSyncData>("outlook-sync", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: {
      age: 3600,
      count: 50,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  },
});

export const outlookSyncWorker = new Worker<OutlookSyncData>(
  "outlook-sync",
  async (job: Job<OutlookSyncData>) => {
    logger.info(`Syncing Outlook for ${job.data.email}`);
    
    try {
      const { accountId, email, deltaToken, fullSync } = job.data;
      
      // Add your Outlook sync logic here
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      logger.info(`Successfully synced Outlook for ${email}`);
      return { success: true, accountId, messagesSynced: 0 };
    } catch (error) {
      logger.error(`Failed to sync Outlook: ${error}`);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 3,
  }
);

outlookSyncWorker.on("completed", (job) => {
  logger.info(`Outlook sync job ${job.id} completed`);
});

outlookSyncWorker.on("failed", (job, err) => {
  logger.error(`Outlook sync job ${job?.id} failed: ${err.message}`);
});
