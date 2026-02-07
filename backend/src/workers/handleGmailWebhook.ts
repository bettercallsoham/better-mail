import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { EmailAccount } from "../shared/models";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { GmailWebhookJobData } from "../shared/queues/handle-webhook.queue";
import { transformGmailToUnified } from "../shared/utils/helpers/gmail-helper";

const elasticService = new ElasticsearchService(elasticClient);

async function processGmailWebhook(job: Job<GmailWebhookJobData>) {
  const { email, lastHistoryId } = job.data;

  logger.info(
    `Processing Gmail webhook: ${email}, historyId: ${lastHistoryId}`,
  );

  //   // Query mailboxId from DB
  //   const emailAccount = await EmailAccount.findOne({
  //     where: { email: email.toLowerCase(), provider: "GOOGLE" },
  //   });

  //   if (!emailAccount) {
  //     throw new Error(`Gmail account not found: ${email}`);
  //   }

  //   const mailboxId = emailAccount.id;
  const gmailService = new GmailApiService({ email });
  const messages = await gmailService.fetchHistorySince(lastHistoryId);

  if (!messages || messages.length === 0) {
    logger.info(`No new messages for ${email}`);
    return { success: true, email, totalIndexed: 0 };
  }

  const documents = messages.map((msg) => transformGmailToUnified(msg, ""));

  await elasticService.bulkIndexEmails(documents);

  logger.info(
    `Gmail webhook processed: ${email}, indexed ${documents.length} emails`,
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
