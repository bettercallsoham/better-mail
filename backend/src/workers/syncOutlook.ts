import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { EmailAccount } from "../shared/models";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { UnifiedEmailDocument } from "../shared/services/elastic/interface";
import { OutlookSyncData } from "../shared/queues/sync-outlook.queue";
import { transformOutlookToUnified } from "../shared/utils/helpers/outlook-helper";

const elasticService = new ElasticsearchService(elasticClient);

async function processOutlookSync(job: Job<OutlookSyncData>) {
  const { email, daysBack = 30 } = job.data;

  logger.info(`Syncing Outlook: ${email}`);

  const emailAccount = await EmailAccount.findOne({
    where: { email: email.toLowerCase() },
  });

  if (!emailAccount) {
    throw new Error(`Email account not found: ${email}`);
  }

  const outlookService = new OutlookApiService({ email });
  const mailboxId = emailAccount.id;
  let batch: UnifiedEmailDocument[] = [];
  let totalSynced = 0;

  const processBatch = async () => {
    if (batch.length > 0) {
      await elasticService.bulkIndexEmails(batch);
      totalSynced += batch.length;
      logger.info(
        `Synced batch: ${batch.length} emails (total: ${totalSynced})`,
      );
      batch = [];
    }
  };

  try {
    await outlookService.fetchLastNDaysEmails(daysBack, {
      onMessage: async (msg) => {
        batch.push(transformOutlookToUnified(msg, mailboxId));

        // Index every 50 emails (as API returns them)
        if (batch.length >= 50) {
          await processBatch();
        }
      },
    });

    // Process remaining
    await processBatch();

    logger.info(`Outlook sync completed: ${email}, total: ${totalSynced}`);

    return {
      success: true,
      email,
      totalSynced,
    };
  } catch (error) {
    logger.error(`Outlook sync failed for ${email}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
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
