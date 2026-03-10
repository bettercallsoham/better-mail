import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { EmailAccount } from "../shared/models";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { UnifiedEmailDocument } from "../shared/services/elastic/interface";
import { GmailSyncData } from "../shared/queues/sync-gmail.queue";
import { transformGmailToUnified } from "../shared/utils/helpers/gmail-helper";
import { embeddingsQueue } from "../shared/queues/generate-embeddings.queue";
import pLimit from "p-limit"; // npm i p-limit

const elasticService = new ElasticsearchService(elasticClient);
const BATCH_SIZE = 100;


const FETCH_CONCURRENCY = 20; 

async function processGmailSync(job: Job<GmailSyncData>) {
  const { email, daysBack = 30 } = job.data;

  const emailAccount = await EmailAccount.findOne({
    where: { email: email.toLowerCase() },
  });
  if (!emailAccount) throw new Error(`Email account not found: ${email}`);

  const gmailService = new GmailApiService({ email });
  const limit = pLimit(FETCH_CONCURRENCY);

  let totalSynced = 0;

  const messageIds: string[] = [];
  for await (const id of gmailService.iterateMessageIds(daysBack)) {
    messageIds.push(id);
  }

  logger.info(`Gmail: found ${messageIds.length} messages for ${email}`);

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const chunk = messageIds.slice(i, i + BATCH_SIZE);

    const messages = await Promise.all(
      chunk.map((id) => limit(() => gmailService.fetchMessage(id))),
    );

    const docs = messages
      .filter(Boolean)
      .map((msg) => transformGmailToUnified(msg!, email));

    await elasticService.bulkIndexEmails(docs);
    totalSynced += docs.length;

    await embeddingsQueue
      .addBulk(
        docs.map((doc) => ({
          name: "generate-embedding",
          data: {
            emailAddress: doc.emailAddress,
            provider: doc.provider,
            providerMessageId: doc.providerMessageId,
          },
        })),
      )
      .catch((err) => logger.warn(`Failed to queue embeddings: ${err.message}`));

    logger.info(`Gmail: indexed ${totalSynced}/${messageIds.length} for ${email}`);

    // Update job progress so frontend can show progress bar
    await job.updateProgress(Math.round((totalSynced / messageIds.length) * 100));
  }

  return { success: true, email, totalSynced };
}

export const gmailSyncWorker = new Worker<GmailSyncData>(
  "gmail-sync",
  processGmailSync,
  {
    connection: redis as any,
    concurrency: 3,
  },
);

gmailSyncWorker.on("completed", (job) => {
  logger.info(`Gmail sync completed: ${job.data.email}`);
});

gmailSyncWorker.on("failed", (job, err) => {
  logger.error(`Gmail sync failed: ${job?.data.email} - ${err.message}`);
});