import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { GmailWebhookJobData } from "../shared/queues/handle-webhook.queue";
import { transformGmailToUnified } from "../shared/utils/helpers/gmail-helper";
import { pusher } from "../shared/config/pusher";
import { EmailAccount } from "../shared/models";
import { getUserIdsByEmail } from "../apis/utils/email-helper";

const elasticService = new ElasticsearchService(elasticClient);

async function processGmailWebhook(job: Job<GmailWebhookJobData>) {
  const { email, historyId, lastHistoryId } = job.data;

  logger.info(
    `Processing Gmail webhook: ${email}, from historyId ${lastHistoryId} to ${historyId}`,
  );

  const gmailService = new GmailApiService({ email });
  const messages = await gmailService.fetchHistorySince(lastHistoryId);

  if (!messages || messages.length === 0) {
    logger.info(`No new messages for ${email}`);
    // Still update historyId to prevent reprocessing
    await redis.set(`gmail:history:${email}`, historyId);
    return { success: true, email, totalIndexed: 0 };
  }

  const documents = messages.map((msg) =>
    transformGmailToUnified(msg, email, true),
  );

  await elasticService.bulkIndexEmails(documents);

  const accounts = await getUserIdsByEmail(email);

  for (const userId of accounts) {
    await pusher.trigger(
      `private-user-${userId}-notifications`,
      "mail.received",
      {
        messages,
        total: documents.length,
      },
    );
  }

  await redis.set(`gmail:history:${email}`, historyId);

  logger.info(
    `Gmail webhook processed: ${email}, indexed ${documents.length} emails, updated historyId to ${historyId}`,
  );

  return {
    success: true,
    email,
    totalIndexed: documents.length,
  };
}

export const gmailWebhookWorker = new Worker<GmailWebhookJobData>(
  "gmail-webhook",
  processGmailWebhook,
  {
    connection: redis as any,
    concurrency: 5,
  },
);

gmailWebhookWorker.on("completed", (job) => {
  logger.info(`Gmail webhook completed: ${job.data.email}`);
});

gmailWebhookWorker.on("failed", (job, err) => {
  logger.error(`Gmail webhook failed: ${job?.data.email} - ${err.message}`);
});
