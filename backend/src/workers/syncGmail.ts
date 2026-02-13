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

const elasticService = new ElasticsearchService(elasticClient);
const BATCH_SIZE = 100;

async function processGmailSync(job: Job<GmailSyncData>) {
  const { email, daysBack = 30 } = job.data;

  logger.info(`Syncing Gmail: ${email} `);

  const emailAccount = await EmailAccount.findOne({
    where: { email: email.toLowerCase() },
  });

  if (!emailAccount) {
    throw new Error(`Email account not found: ${email}`);
  }

  const gmailService = new GmailApiService({ email });
  let batch: UnifiedEmailDocument[] = [];
  let totalSynced = 0;

  const processBatch = async () => {
    if (batch.length > 0) {
      job.log(JSON.stringify(batch));
      await elasticService.bulkIndexEmails(batch);
      totalSynced += batch.length;
      logger.info(
        `Synced batch: ${batch.length} emails (total: ${totalSynced})`,
      );
      
      // Queue emails for embedding generation
      await Promise.all(
        batch.map((email) =>
          embeddingsQueue.add("generate-embedding", {
            emailAddress: email.emailAddress,
            provider: email.provider,
            providerMessageId: email.providerMessageId,
          }),
        ),
      );
      
      batch = [];
    }
  };

  try {
    await gmailService.fetchLastNDaysEmails(daysBack, async (msg) => {
      batch.push(transformGmailToUnified(msg, email));

      if (batch.length >= BATCH_SIZE) {
        await processBatch();
      }
    });

    // Process remaining
    await processBatch();

    logger.info(`Gmail sync completed: ${email}, total: ${totalSynced}`);

    return {
      success: true,
      email,
      totalSynced,
    };
  } catch (error) {
    logger.error(`Gmail sync failed for ${email}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
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
