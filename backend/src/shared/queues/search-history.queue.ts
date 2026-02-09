import { Queue } from "bullmq";
import { redis } from "../config/redis";

export interface SearchHistoryData {
  userId: string;
  searchText: string;
  filters: {
    isRead?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
    hasAttachments?: boolean;
    from?: string;
    to?: string;
    labels?: string[];
    dateFrom?: string;
    dateTo?: string;
  };
  resultsCount: number;
  executionTimeMs: number;
  emailAddresses: string[];
}

export const searchHistoryQueue = new Queue<SearchHistoryData>("search-history", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 24 * 3600, // 1 day
    },
  },
});
