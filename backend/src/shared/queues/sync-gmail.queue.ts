import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

interface GmailSyncData {
  accountId: string;
  email: string;
  historyId?: string;
  fullSync?: boolean;
}

export const gmailSyncQueue = new Queue<GmailSyncData>("gmail-sync", {
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

export const gmailSyncWorker = new Worker<GmailSyncData>(
  "gmail-sync",
  async (job: Job<GmailSyncData>) => {
    logger.info(`Syncing Gmail for ${job.data.email}`);

    try {
      const { accountId, email, historyId, fullSync } = job.data;

      // Add your Gmail sync logic here
      await new Promise((resolve) => setTimeout(resolve, 2000));

      logger.info(`Successfully synced Gmail for ${email}`);
      return { success: true, accountId, messagesSynced: 0 };
    } catch (error) {
      logger.error(`Failed to sync Gmail: ${error}`);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 3,
  },
);

gmailSyncWorker.on("completed", (job) => {
  logger.info(`Gmail sync job ${job.id} completed`);
});

gmailSyncWorker.on("failed", (job, err) => {
  logger.error(`Gmail sync job ${job?.id} failed: ${err.message}`);
});
