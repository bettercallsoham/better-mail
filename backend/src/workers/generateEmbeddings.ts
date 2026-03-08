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
import { piiService } from "../shared/services/ai/pii.service";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";

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
  if (!email || !emailAddress) {
    throw new Error(`Email metadata not found: ${compositeId}`);
  }

  let rawBody = "";
  try {
    if (provider === "gmail") {
      const gmailService = new GmailApiService({ email: emailAddress });
      const body = await gmailService.fetchMessageBody(providerMessageId);
      rawBody = body.bodyText ?? body.bodyHtml ?? "";
    } else if (provider === "outlook") {
      const outlookService = new OutlookApiService({ email: emailAddress });
      const body = await outlookService.fetchMessageBody(providerMessageId);
      rawBody = body.bodyText ?? body.bodyHtml ?? "";
    }
  } catch (err) {
    logger.warn(
      `Body fetch failed for ${compositeId}, embedding metadata only`,
    );
    rawBody = email.snippet ?? "";
  }

  const rawText = [`Subject: ${email.subject}`, `Body: ${rawBody}`].join(
    "\n\n",
  );

  const textToEmbed = await piiService.sanitize(rawText);

  const response = await embeddingsClient.embeddings.create({
    model: EMBEDDINGS_MODEL_DEPLOYMENT!,
    input: textToEmbed,
  });

  const embedding = response.data[0].embedding;

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
