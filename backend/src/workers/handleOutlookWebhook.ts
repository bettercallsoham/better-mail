import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { OutlookWebhookJobData } from "../shared/queues/handle-webhook.queue";
import { transformOutlookToUnified } from "../shared/utils/helpers/outlook-helper";
import { embeddingsQueue } from "../shared/queues/generate-embeddings.queue";
import { pusher } from "../shared/config/pusher";
import { getUserIdsByEmail } from "../apis/utils/email-helper";

const elasticService = new ElasticsearchService(elasticClient);

async function processOutlookWebhook(job: Job<OutlookWebhookJobData>) {
  const { email, messageId } = job.data;

  logger.info(`Processing Outlook webhook: ${email}, messageId: ${messageId}`);

  const outlookService = new OutlookApiService({ email });
  const message = await outlookService.fetchMessageById(messageId);

  if (!message) {
    logger.warn(`Message not found: ${messageId}`);
    return { success: false, email, messageId };
  }

  const document = transformOutlookToUnified(message, email, true);
  await elasticService.indexEmail(document);

  // Queue embeddings and notify — only for non-draft emails
  if (!document.isDraft) {
    await embeddingsQueue
      .add("generate-embedding", {
        emailAddress: document.emailAddress,
        provider: document.provider,
        providerMessageId: document.providerMessageId,
      })
      .catch((err) =>
        logger.error(
          `Failed to queue embedding for ${document.providerMessageId}: ${err.message}`,
        ),
      );

    const accounts = await getUserIdsByEmail(email);
    for (const userId of accounts) {
      await pusher.trigger(
        `private-user-${userId}-notifications`,
        "mail.received",
        { messages: [document], total: 1 },
      );
    }
  }

  return {
    success: true,
    email,
    messageId,
  };
}

export const outlookWebhookWorker = new Worker<OutlookWebhookJobData>(
  "outlook-webhook",
  processOutlookWebhook,
  {
    connection: redis as any,
    concurrency: 10,
  },
);

outlookWebhookWorker.on("completed", (job) => {
  logger.info(`Outlook webhook completed: ${job.data.email}`);
});

outlookWebhookWorker.on("failed", (job, err) => {
  logger.error(`Outlook webhook failed: ${job?.data.email} - ${err.message}`);
});
