import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { OutlookWebhookJobData } from "../shared/queues/handle-webhook.queue";
import { transformOutlookToUnified } from "../shared/utils/helpers/outlook-helper";
import { EmailAccount } from "../shared/models";

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

  logger.info(`Outlook webhook processed: ${email}, messageId: ${messageId}`);

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
