import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

export interface GmailSyncData {
  email: string;
  daysBack?: number;
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
