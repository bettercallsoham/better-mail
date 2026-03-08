import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { OutlookWebhookJobData } from "../shared/queues/handle-webhook.queue";
import { transformOutlookToUnified } from "../shared/utils/helpers/outlook-helper";
import { embeddingsQueue } from "../shared/queues/generate-embeddings.queue";
import { summarizationQueue } from "../shared/queues/generate-summary.queue";
import { piiService } from "../shared/services/ai/pii.service";
import { pusher } from "../shared/config/pusher";
import { getUserIdsByEmail } from "../apis/utils/email-helper";
import sanitizeHtml from "sanitize-html";

const elasticService = new ElasticsearchService(elasticClient);

function extractPlainText(
  bodyHtml: string | null | undefined,
  bodyText: string | null | undefined,
): string {
  if (bodyHtml) {
    return sanitizeHtml(bodyHtml, { allowedTags: [], allowedAttributes: {} });
  }
  return bodyText ?? "";
}

async function processOutlookWebhook(job: Job<OutlookWebhookJobData>) {
  const { email, messageId } = job.data;

  logger.info(
    `Processing new Outlook message: ${email}, messageId: ${messageId}`,
  );

  const outlookService = new OutlookApiService({ email });

  const message = await outlookService.fetchMessageById(messageId);

  if (!message) {
    logger.warn(`Message not found: ${messageId}`);
    return { success: false, email, messageId };
  }

  const document = transformOutlookToUnified(message, email, true);

  await elasticService.indexEmail(document);

  if (document.isDraft) {
    const accounts = await getUserIdsByEmail(email);
    for (const userId of accounts) {
      await pusher
        .trigger(`private-user-${userId}-notifications`, "draft.updated", {
          drafts: [document],
          total: 1,
        })
        .catch((err) => logger.error(`Pusher failed for ${userId}: ${err}`));
    }

    return { success: true, email, messageId, type: "draft" };
  }

  // ── New real email — embed + summarize + notify ───────────────────────

  // Queue embedding — worker re-fetches body, sanitizes, embeds, discards
  await embeddingsQueue
    .add("generate-embedding", {
      emailAddress: document.emailAddress,
      provider: document.provider,
      providerMessageId: document.providerMessageId,
    })
    .catch((err) =>
      logger.error(
        `Failed to queue embedding for ${messageId}: ${err.message}`,
      ),
    );

  // Sanitize PII from body here — body in memory from transform
  // Pass sanitized text to summary queue — body leaves scope after this block
  try {
    const rawText = extractPlainText(
      (document as any).bodyHtml ?? null,
      (document as any).bodyText ?? null,
    );

    const sanitizedText = await piiService.sanitize(
      `Subject: ${document.subject ?? ""}\n\n${rawText}`,
    );

    await summarizationQueue.add("generate-summary", {
      emailAddress: document.emailAddress,
      provider: document.provider,
      providerMessageId: document.providerMessageId,
      threadId: document.threadId,
      sanitizedText,
      subject: document.subject ?? "",
      fromEmail: document.from.email,
      fromName: document.from.name,
      receivedAt: document.receivedAt,
    });
  } catch (err) {
    logger.error(`Failed to queue summary for ${messageId}: ${err}`);
  }

  const accounts = await getUserIdsByEmail(email);
  for (const userId of accounts) {
    await pusher
      .trigger(`private-user-${userId}-notifications`, "mail.received", {
        messages: document,
        total: 1,
      })
      .catch((err) => logger.error(`Pusher failed for ${userId}: ${err}`));
  }

  return { success: true, email, messageId, type: "email" };
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
  logger.info(
    `Outlook webhook completed: ${job.data.email} - ${job.data.messageId}`,
  );
});

outlookWebhookWorker.on("failed", (job, err) => {
  logger.error(`Outlook webhook failed: ${job?.data.email} - ${err.message}`);
});
