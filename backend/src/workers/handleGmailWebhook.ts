import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { ElasticsearchService } from "../shared/services/elastic/elastic.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";
import { GmailWebhookJobData } from "../shared/queues/handle-webhook.queue";
import { transformGmailToUnified } from "../shared/utils/helpers/gmail-helper";
import { pusher } from "../shared/config/pusher";
import { getUserIdsByEmail } from "../apis/utils/email-helper";
import { embeddingsQueue } from "../shared/queues/generate-embeddings.queue";
import { summarizationQueue } from "../shared/queues/generate-summary.queue";
import { piiService } from "../shared/services/ai/pii.service";
import sanitizeHtml from "sanitize-html";

const elasticService = new ElasticsearchService(elasticClient);

interface LabelChange {
  messageId: string;
  labelsAdded: string[];
  labelsRemoved: string[];
}

function getEsUpdatesFromLabelChange(
  change: LabelChange,
): Record<string, any> | null {
  const updates: Record<string, any> = {};
  const added = change.labelsAdded ?? [];
  const removed = change.labelsRemoved ?? [];

  if (added.includes("STARRED")) updates.isStarred = true;
  if (removed.includes("STARRED")) updates.isStarred = false;
  if (removed.includes("UNREAD")) updates.isRead = true;
  if (added.includes("UNREAD")) updates.isRead = false;
  if (removed.includes("INBOX")) updates.isArchived = true;
  if (added.includes("INBOX")) updates.isArchived = false;
  if (added.includes("TRASH")) updates.isDeleted = true;
  if (removed.includes("TRASH")) updates.isDeleted = false;

  return Object.keys(updates).length > 0 ? updates : null;
}

function extractPlainText(
  bodyHtml: string | null | undefined,
  bodyText: string | null | undefined,
): string {
  if (bodyHtml) {
    return sanitizeHtml(bodyHtml, { allowedTags: [], allowedAttributes: {} });
  }
  return bodyText ?? "";
}

// -----------------------------------------------------------------------
// MAIN WORKER
// -----------------------------------------------------------------------

async function processGmailWebhook(job: Job<GmailWebhookJobData>) {
  const { email, historyId, lastHistoryId } = job.data;

  logger.info(
    `Processing Gmail webhook: ${email}, historyId ${lastHistoryId} → ${historyId}`,
  );

  const gmailService = new GmailApiService({ email });

  const client = await (gmailService as any).getClient();

  let pageToken: string | undefined;
  const newMessages: any[] = [];
  const labelChanges: LabelChange[] = [];
  const seenMessageIds = new Set<string>();

  do {
    const res = await client.get("/users/me/history", {
      params: {
        startHistoryId: lastHistoryId,
        historyTypes: ["messageAdded", "labelAdded", "labelRemoved"],
        maxResults: 100,
        pageToken,
      },
    });

    for (const h of res.data.history ?? []) {
      // ── New messages ────────────────────────────────────────────────
      for (const item of h.messagesAdded ?? []) {
        const messageId = item.message?.id;
        if (!messageId || seenMessageIds.has(messageId)) continue;
        seenMessageIds.add(messageId);

        const fullMsg = await (gmailService as any).fetchMessage(messageId);
        if (fullMsg) newMessages.push(fullMsg);
      }

      // ── Label changes ────────────────────────────────────────────────
      const labelsAdded: string[] = [];
      const labelsRemoved: string[] = [];
      const affectedIds = new Set<string>();

      for (const item of h.labelsAdded ?? []) {
        if (item.message?.id) {
          affectedIds.add(item.message.id);
          labelsAdded.push(...(item.labelIds ?? []));
        }
      }

      for (const item of h.labelsRemoved ?? []) {
        if (item.message?.id) {
          affectedIds.add(item.message.id);
          labelsRemoved.push(...(item.labelIds ?? []));
        }
      }

      for (const messageId of affectedIds) {
        if (seenMessageIds.has(messageId)) continue;
        labelChanges.push({ messageId, labelsAdded, labelsRemoved });
      }
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const documents = newMessages.map((msg) =>
    transformGmailToUnified(msg, email, true),
  );

  const nonDraftDocs = documents.filter((d) => !d.isDraft);
  const draftDocs = documents.filter((d) => d.isDraft);

  if (documents.length > 0) {
    await elasticService.bulkIndexEmails(documents);
  }

  // Queue embeddings for non-drafts
  await Promise.all(
    nonDraftDocs.map((doc) =>
      embeddingsQueue
        .add("generate-embedding", {
          emailAddress: doc.emailAddress,
          provider: doc.provider,
          providerMessageId: doc.providerMessageId,
        })
        .catch((err) =>
          logger.error(
            `Failed to queue embedding for ${doc.providerMessageId}: ${err.message}`,
          ),
        ),
    ),
  );

  // Queue summarization for new non-draft emails only
  // Body is in memory from transform — sanitize PII here, pass redacted text to queue
  // Body leaves scope after this block, never written anywhere
  await Promise.all(
    nonDraftDocs.map(async (doc) => {
      try {
        const rawText = extractPlainText(
          (doc as any).bodyHtml ?? null,
          (doc as any).bodyText ?? null,
        );

        const sanitizedText = await piiService.sanitize(
          `Subject: ${doc.subject ?? ""}\n\n${rawText}`,
        );

        await summarizationQueue.add("generate-summary", {
          emailAddress: doc.emailAddress,
          provider: doc.provider,
          providerMessageId: doc.providerMessageId,
          threadId: doc.threadId,
          sanitizedText,
          subject: doc.subject ?? "",
          fromEmail: doc.from.email,
          fromName: doc.from.name,
          receivedAt: doc.receivedAt,
        });
      } catch (err) {
        // Summary failure is non-critical — indexing + embedding already succeeded
        logger.error(
          `Failed to queue summary for ${doc.providerMessageId}: ${err}`,
        );
      }
    }),
  );

  // ── Handle label changes ────────────────────────────────────────────

  if (labelChanges.length > 0) {
    // Group by update shape to minimize ES bulk calls
    const updateGroups = new Map<string, string[]>();

    for (const change of labelChanges) {
      const updates = getEsUpdatesFromLabelChange(change);
      if (!updates) continue;

      const key = JSON.stringify(updates);
      if (!updateGroups.has(key)) updateGroups.set(key, []);
      updateGroups.get(key)!.push(change.messageId);
    }

    await Promise.all(
      [...updateGroups.entries()].map(([updatesKey, messageIds]) =>
        elasticService
          .bulkUpdateEmails({
            provider: "gmail",
            providerMessageIds: messageIds,
            updates: JSON.parse(updatesKey),
          })
          .catch((err) =>
            logger.error(
              `Failed to bulk update label changes in ES: ${err.message}`,
            ),
          ),
      ),
    );

    logger.info(`Processed ${labelChanges.length} label changes for ${email}`);
  }

  // ── Push notifications ────────────────────────────────────────────

  const accounts =
    documents.length > 0 || labelChanges.length > 0
      ? await getUserIdsByEmail(email)
      : [];

  for (const userId of accounts) {
    // New emails
    if (nonDraftDocs.length > 0) {
      await pusher.trigger(
        `private-user-${userId}-notifications`,
        "mail.received",
        {
          messages: nonDraftDocs,
          total: nonDraftDocs.length,
        },
      );
    }

    // Draft changes — frontend refreshes draft list
    if (draftDocs.length > 0) {
      await pusher.trigger(
        `private-user-${userId}-notifications`,
        "draft.updated",
        {
          drafts: draftDocs,
          total: draftDocs.length,
        },
      );
    }

    // Label changes — frontend updates read/star/archive state optimistically
    if (labelChanges.length > 0) {
      await pusher.trigger(
        `private-user-${userId}-notifications`,
        "mail.labels_changed",
        { changes: labelChanges },
      );
    }
  }

  await redis.set(`gmail:history:${email}`, historyId);

  logger.info(
    `Gmail webhook done: ${email} — ` +
      `${documents.length} new emails, ${labelChanges.length} label changes`,
  );

  return {
    success: true,
    email,
    totalIndexed: documents.length,
    labelChangesProcessed: labelChanges.length,
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
