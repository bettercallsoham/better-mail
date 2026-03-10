import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";

interface MailboxConnectionData {
  email: string;
  provider: "google" | "outlook";
}

export const handleMailboxConnectionQueue = new Queue<MailboxConnectionData>(
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
        count: 200,
      },
      removeOnFail: {
        count: 200,
      },
    },
  },
);
