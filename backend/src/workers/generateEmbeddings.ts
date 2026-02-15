import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import {
  embeddingsClient,
  EMBEDDINGS_MODEL_DEPLOYMENT,
  AZURE_OPEN_AI_KEY,
  EMBEDDINGS_ENDPOINT,
} from "../shared/config/llm";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { EmbeddingJobData } from "../shared/queues/generate-embeddings.queue";

// Validate required environment variables
if (!AZURE_OPEN_AI_KEY) {
  throw new Error("AZURE_OPEN_AI_KEY environment variable is required");
}
if (!EMBEDDINGS_ENDPOINT) {
  throw new Error("EMBEDDINGS_ENDPOINT environment variable is required");
}
if (!EMBEDDINGS_MODEL_DEPLOYMENT) {
  throw new Error(
    "EMBEDDINGS_MODEL_DEPLOYMENT environment variable is required",
  );
}

const elasticService = new ElasticsearchService(elasticClient);

async function processEmbedding(job: Job<EmbeddingJobData>) {
  const { emailAddress, provider, providerMessageId } = job.data;
  const compositeId = `${provider}_${providerMessageId}`;

  const email = await elasticService.getEmailById(compositeId);

  if (!email) {
    throw new Error(`Email not found: ${compositeId}`);
  }

  // Combine email fields for embedding - structured for better RAG accuracy
  const textToEmbed = [
    `Subject: ${email.subject}`,
    `From: ${email.from.name || email.from.email}`,
    `To: ${email.to.map((t) => t.name || t.email).join(", ")}`,
    `Body: ${email.bodyText || email.snippet || ""}`,
  ].join("\n\n");

  // Generate embedding - OpenAI handles token limits automatically
  const response = await embeddingsClient.embeddings.create({
    model: EMBEDDINGS_MODEL_DEPLOYMENT!,
    input: textToEmbed,
  });

  const embedding = response.data[0].embedding;

  // Upsert to Elasticsearch with embedding
  await elasticService.upsertEmailWithEmbedding(compositeId, embedding);

  logger.info(
    `Embedding generated for ${compositeId} (${embedding.length} dims)`,
  );

  return { compositeId, embeddingLength: embedding.length };
}

export const embeddingsWorker = new Worker<EmbeddingJobData>(
  "generate-embeddings",
  processEmbedding,
  {
    connection: redis as any,
    concurrency: 10,
  },
);

embeddingsWorker.on("completed", (job) => {
  logger.info(
    `Embedding completed: ${job.data.provider}_${job.data.providerMessageId}`,
  );
});

embeddingsWorker.on("failed", (job, err) => {
  logger.error(
    `Embedding failed: ${job?.data.provider}_${job?.data.providerMessageId}` +
      err.message,
  );
});
