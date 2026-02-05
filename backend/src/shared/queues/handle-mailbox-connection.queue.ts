import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

interface MailboxConnectionData {
  accountId: string;
  email: string;
  provider: "google" | "outlook";
}

export const mailboxConnectionQueue = new Queue<MailboxConnectionData>(
  "mailbox-connection",
  {
    connection: redis as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
      },
    },
  },
);

export const mailboxConnectionWorker = new Worker<MailboxConnectionData>(
  "mailbox-connection",
  async (job: Job<MailboxConnectionData>) => {
    logger.info(`Processing mailbox connection for ${job.data.email}`);

    try {
      // Add your mailbox connection logic here
      const { accountId, email, provider } = job.data;

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info(`Successfully connected mailbox for ${email}`);
      return { success: true, accountId, email };
    } catch (error) {
      logger.error(`Failed to connect mailbox: ${error}`);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
  },
);

mailboxConnectionWorker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

mailboxConnectionWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed with error: ${err.message}`);
});
