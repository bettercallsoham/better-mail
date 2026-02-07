import { Queue } from "bullmq";
import { redis } from "../config/redis";

export interface OutlookSyncData {
  email: string;
  daysBack?: number;
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
