import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { SearchHistoryData } from "../shared/queues/search-history.queue";

const elasticService = new ElasticsearchService(elasticClient);

async function processSearchHistory(job: Job<SearchHistoryData>) {
  const {
    userId,
    searchText,
    filters,
    resultsCount,
    executionTimeMs,
    emailAddresses,
  } = job.data;

  logger.info(`Storing search history for user: ${userId}`);

  try {
    // Generate random ID - we want to keep ALL searches for analytics
    const id = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await elasticService.addSearchHistory({
      id,
      userId,
      searchText,
      filters,
      resultsCount,
      executionTimeMs,
      emailAddresses,
      searchedAt: new Date().toISOString(),
    });

    logger.info(`Search history stored successfully for user: ${userId}`);
  } catch (error: any) {
    logger.error(`Failed to store search history: ${error.message}`);
    throw error; // Re-throw to trigger retry
  }
}

export const searchHistoryWorker = new Worker<SearchHistoryData>(
  "search-history",
  processSearchHistory,
  {
    connection: redis as any,
    concurrency: 10, // Process multiple searches concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  },
);

searchHistoryWorker.on("completed", (job) => {
  logger.info(`Search history job ${job.id} completed`);
});

searchHistoryWorker.on("failed", (job, err) => {
  logger.error(`Search history job ${job?.id} failed: ${err.message}`);
});

searchHistoryWorker.on("error", (err) => {
  logger.error(`Search history worker error: ${err.message}`);
});
