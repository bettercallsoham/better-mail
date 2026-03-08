import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { elasticClient } from "../shared/config/elastic";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { ThreadService, ThreadSummary } from "../shared/services/elastic/thread.service";
import { logger } from "../shared/utils/logger";
import { SummarizationJobData } from "../shared/queues/generate-summary.queue";
import { AISummaryService } from "../shared/services/ai/ai.service";
import { RAGService } from "../shared/services/ai/rag.service";
import { EmbeddingsService } from "../shared/services/ai/embeddings.service";
import { VectorSearchService } from "../shared/services/elastic/vector-search.service";

const elasticService = new ElasticsearchService(elasticClient);
const threadService = new ThreadService(elasticService);

const embeddingsService = new EmbeddingsService();
const vectorSearchService = new VectorSearchService(elasticClient);
const ragService = new RAGService(embeddingsService, vectorSearchService);
const aiSummaryService = new AISummaryService(ragService);

async function processSummarization(job: Job<SummarizationJobData>) {
  const {
    emailAddress,
    providerMessageId,
    threadId,
    sanitizedText,
    subject,
    fromEmail,
    fromName,
    receivedAt,
  } = job.data;

  logger.info(`Summarizing new email ${providerMessageId} for thread ${threadId}`);

  const emailsText = `Email 1:
From: ${fromName || fromEmail}
Date: ${new Date(receivedAt).toLocaleString()}
Subject: ${subject || "(no subject)"}

${sanitizedText || "(no body)"}

---`;

  const summaryData = await aiSummaryService.summarizeThread({
    emailsText,
    previousSummary: undefined,
  });

  const summary: ThreadSummary = {
    text: summaryData.summary,
    keyPoints: summaryData.keyPoints.join("\n"),
    actionItems: summaryData.actionItems.join("\n"),
    sentiment: summaryData.sentiment,
    priority: summaryData.priority,
  };

  await threadService.saveThreadSummary({
    threadId,
    emailAddress,
    summary,
    summarizedUpToDate: receivedAt,
  });

  logger.info(`Summary stored for ${providerMessageId} in thread ${threadId}`);

  return {
    providerMessageId,
    threadId,
    digestLength: summaryData.summary.length,
    keyPointsCount: summaryData.keyPoints.length,
  };
}

export const summarizationWorker = new Worker<SummarizationJobData>(
  "generate-summary",
  processSummarization,
  {
    connection: redis as any,
    concurrency: 2,
  },
);

summarizationWorker.on("completed", (job) => {
  logger.info(
    `Summary completed: ${job.data.providerMessageId} (thread: ${job.data.threadId})`,
  );
});

summarizationWorker.on("failed", (job, err) => {
  logger.error(
    `Summary failed: ${job?.data.providerMessageId} - ${err.message}`,
  );
});