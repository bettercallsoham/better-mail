import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { EmailAccount } from "../shared/models";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { UnifiedEmailDocument } from "../shared/services/elastic/interface";
import { GmailMessage } from "../shared/services/gmail/interfaces";
import { GmailSyncData } from "../shared/queues/sync-gmail.queue";

const elasticService = new ElasticsearchService(elasticClient);
const BATCH_SIZE = 100;

function transformGmailToUnified(
  msg: GmailMessage,
  mailboxId: string,
): UnifiedEmailDocument {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    "";

  return {
    id: msg.id,
    provider: "gmail",
    providerMessageId: msg.id,
    providerThreadId: msg.threadId,
    mailboxId,

    threadId: msg.threadId,
    isThreadRoot: false, // TODO: determine based on thread logic

    receivedAt: new Date(parseInt(msg.internalDate)).toISOString(),
    sentAt: new Date(parseInt(msg.internalDate)).toISOString(),
    indexedAt: new Date().toISOString(),

    from: { email: getHeader("From") },
    to: [{ email: getHeader("To") }],
    cc: [],
    bcc: [],

    subject: getHeader("Subject"),
    snippet: msg.snippet || "",
    searchText: `${getHeader("Subject")} ${msg.snippet}`,

    hasAttachments: msg.payload?.parts?.some((p) => p.filename) || false,
    attachments: [],

    isRead: !msg.labelIds?.includes("UNREAD"),
    isStarred: msg.labelIds?.includes("STARRED") || false,
    isArchived: !msg.labelIds?.includes("INBOX"),
    isDeleted: msg.labelIds?.includes("TRASH") || false,

    labels: msg.labelIds || [],
    providerLabels: msg.labelIds || [],
  };
}

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
    await gmailService.fetchLastNDaysEmails(daysBack, async (msg) => {
      batch.push(transformGmailToUnified(msg, mailboxId));

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
