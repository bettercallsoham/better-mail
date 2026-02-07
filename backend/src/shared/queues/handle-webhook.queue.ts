import { Queue } from "bullmq";
import { redis } from "../config/redis";

export interface GmailWebhookJobData {
  email: string;
  historyId: string;
  lastHistoryId: string;
}

export interface OutlookWebhookJobData {
  email: string;
  mailboxId: string;
  messageId: string;
}

export const gmailWebhookQueue = new Queue<GmailWebhookJobData>(
  "gmail-webhook",
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

export const outlookWebhookQueue = new Queue<OutlookWebhookJobData>(
  "outlook-webhook",
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
