import { Router } from "express";
import redis from "../../shared/config/redis";
import { EmailAccount } from "../../shared/models";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { elasticClient } from "../../shared/config/elastic";
import {
  gmailWebhookQueue,
  outlookWebhookQueue,
} from "../../shared/queues/handle-webhook.queue";
import { pusher } from "../../shared/config/pusher";
import { getUserIdsByEmail } from "../utils/email-helper";
import { logger } from "@sentry/node";

const router = Router();
const elasticService = new ElasticsearchService(elasticClient);


function resolveOutlookStateUpdate(
  resourceData: any,
): Record<string, any> | null {
  const updates: Record<string, any> = {};

  if (resourceData.isRead !== undefined) {
    updates.isRead = resourceData.isRead;
  }

  if (resourceData.flag?.flagStatus !== undefined) {
    updates.isStarred = resourceData.flag.flagStatus === "flagged";
  }

  // Draft metadata update — subject/snippet changed, no body fetch needed
  if (resourceData.isDraft === true) {
    updates.isDraft = true;
    if (resourceData.subject !== undefined) {
      updates.subject = resourceData.subject;
    }
    if (resourceData.bodyPreview !== undefined) {
      updates.snippet = resourceData.bodyPreview;
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

async function getEmailForSubscription(
  subscriptionId: string,
): Promise<string | null> {
  const cacheKey = `outlook:subscription:${subscriptionId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached).email;
  }

  const account = await EmailAccount.findOne({
    where: { subscription_id: subscriptionId, provider: "OUTLOOK" },
  });

  if (!account) return null;

  await redis.setex(cacheKey, 3600, JSON.stringify({ email: account.email }));
  return account.email;
}

router.post("/", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message?.data) {
      return res.sendStatus(204);
    }

    const decoded = Buffer.from(message.data, "base64").toString("utf8");
    const payload = JSON.parse(decoded);
    const { emailAddress, historyId } = payload;

    if (!emailAddress || !historyId) {
      return res.sendStatus(204);
    }

    const lastHistoryId = await redis.get(`gmail:history:${emailAddress}`);

    if (!lastHistoryId) {
      await redis.set(`gmail:history:${emailAddress}`, historyId);
      return res.sendStatus(200);
    }

    if (parseInt(historyId) <= parseInt(lastHistoryId)) {
      return res.sendStatus(200);
    }

    await gmailWebhookQueue.add("process-gmail-webhook", {
      email: emailAddress,
      historyId,
      lastHistoryId,
    });

    return res.sendStatus(200);
  } catch (err) {
    logger.error("Gmail webhook error:", { err });
    return res.sendStatus(200);
  }
});


router.post("/outlook", async (req, res) => {
  try {
    // Outlook sends a validation token on subscription creation
    if (req.query.validationToken) {
      return res.status(200).send(req.query.validationToken);
    }

    const notifications = req.body?.value;

    if (!Array.isArray(notifications)) {
      return res.sendStatus(202);
    }

    await Promise.all(
      notifications.map(async (n) => {
        try {
          if (n.clientState !== process.env.OUTLOOK_CLIENT_STATE) {
            logger.warn(`Invalid clientState on notification, skipping`);
            return;
          }

          const messageId = n.resourceData?.id;
          const subscriptionId = n.subscriptionId;
          const changeType: string = n.changeType ?? "created";

          if (!messageId || !subscriptionId) return;

          const email = await getEmailForSubscription(subscriptionId);
          if (!email) {
            logger.error(`No account found for subscription: ${subscriptionId}`);
            return;
          }

          if (changeType === "updated") {
            const updates = resolveOutlookStateUpdate(n.resourceData ?? {});

            if (!updates) {
              return;
            }

            await elasticService
              .bulkUpdateEmails({
                provider: "outlook",
                providerMessageIds: [messageId],
                updates,
              })
              .catch((err) =>
                logger.error(
                  `ES update failed for ${messageId}: ${err.message}`,
                ),
              );

            const accounts = await getUserIdsByEmail(email);
            for (const userId of accounts) {
              const event = n.resourceData?.isDraft
                ? "draft.updated"
                : "mail.labels_changed";

              await pusher
                .trigger(`private-user-${userId}-notifications`, event, {
                  changes: [{ messageId, updates }],
                })
                .catch((err) =>
                  logger.error(`Pusher trigger failed for ${userId}: ${err}`),
                );
            }

            return;
          }

       
          await outlookWebhookQueue.add("process-outlook-webhook", {
            email,
            messageId,
            changeType,
          });
        } catch (err) {
          logger.error(`Failed to process Outlook notification: ${err}`);
        }
      }),
    );

    return res.sendStatus(202);
  } catch (err: unknown) {
    logger.error("Outlook webhook error:", { err });
    return res.sendStatus(202);
  }
});

export default router;