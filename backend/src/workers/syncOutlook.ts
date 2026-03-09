import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { EmailAccount } from "../shared/models";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { OutlookSyncData } from "../shared/queues/sync-outlook.queue";
import { transformOutlookToUnified } from "../shared/utils/helpers/outlook-helper";
import { OutlookMessage } from "../shared/services/outlook/interfaces";
import { embeddingsQueue } from "../shared/queues/generate-embeddings.queue";
import pLimit from "p-limit";

const elasticService = new ElasticsearchService(elasticClient);

const BATCH_SIZE = 50;
const PAGE_CONCURRENCY = 3;

async function processOutlookSync(job: Job<OutlookSyncData>) {
  const { email, daysBack = 30 } = job.data;

  const emailAccount = await EmailAccount.findOne({
    where: { email: email.toLowerCase() },
  });
  if (!emailAccount) throw new Error(`Email account not found: ${email}`);

  const outlookService = new OutlookApiService({ email });
  const limit = pLimit(PAGE_CONCURRENCY);

  let totalSynced = 0;

  const pagePromises: Promise<void>[] = [];

  const flushPage = async (msgs: OutlookMessage[]) => {
    const docs = msgs.map((msg) => transformOutlookToUnified(msg, email));

    await elasticService.bulkIndexEmails(docs);

    embeddingsQueue
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
      .catch((err) =>
        logger.warn(`Failed to queue embeddings: ${err.message}`),
      );

    totalSynced += docs.length;
    logger.info(`Outlook: indexed ${totalSynced} for ${email}`);
    await job.updateProgress(totalSynced);
  };

  let currentPage: OutlookMessage[] = [];

  for await (const msg of outlookService.iterateMessages(daysBack)) {
    currentPage.push(msg);

    if (currentPage.length >= BATCH_SIZE) {
      const page = [...currentPage];
      currentPage = [];
      pagePromises.push(limit(() => flushPage(page)));
    }
  }

  if (currentPage.length > 0) {
    pagePromises.push(limit(() => flushPage(currentPage)));
  }

  await Promise.all(pagePromises);

  return { success: true, email, totalSynced };
}

export const outlookSyncWorker = new Worker<OutlookSyncData>(
  "outlook-sync",
  processOutlookSync,
  {
    connection: redis as any,
    concurrency: 3,
  },
);

outlookSyncWorker.on("completed", (job) => {
  logger.info(`Outlook sync completed: ${job.data.email}`);
});

outlookSyncWorker.on("failed", (job, err) => {
  logger.error(`Outlook sync failed: ${job?.data.email} - ${err.message}`);
});
