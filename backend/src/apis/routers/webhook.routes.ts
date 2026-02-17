import { Router } from "express";
import redis from "../../shared/config/redis";
import { EmailAccount } from "../../shared/models";
import {
  gmailWebhookQueue,
  outlookWebhookQueue,
} from "../../shared/queues/handle-webhook.queue";
import { logger } from "@sentry/node";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message?.data) {
      return res.sendStatus(204);
    }

    const decoded = Buffer.from(message.data, "base64").toString("utf8");
    const payload = JSON.parse(decoded);
    const { emailAddress, historyId } = payload;

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
    if (req.query.validationToken) {
      return res.status(200).send(req.query.validationToken);
    }

    const notifications = req.body?.value;

    if (!Array.isArray(notifications)) {
      return res.sendStatus(202);
    }

    for (const n of notifications) {
      if (n.clientState !== process.env.OUTLOOK_CLIENT_STATE) {
        logger.warn("Invalid clientState, ignoring");
        continue;
      }

      const messageId = n.resourceData?.id;
      const subscriptionId = n.subscriptionId;

      if (!messageId || !subscriptionId) {
        continue;
      }

      const cacheKey = `subscription:${subscriptionId}`;
      let cached = await redis.get(cacheKey);

      let email: string;

      if (cached) {
        const data = JSON.parse(cached);
        email = data.email;
      } else {
        const account = await EmailAccount.findOne({
          where: { subscription_id: subscriptionId, provider: "OUTLOOK" },
        });

        if (!account) {
          logger.error(
            `Outlook account not found for subscription: ${subscriptionId}`,
          );
          continue;
        }

        email = account.email;
        await redis.setex(cacheKey, 3600, JSON.stringify({ email }));
      }

      // Enqueue webhook job
      await outlookWebhookQueue.add("process-outlook-webhook", {
        email,
        messageId,
      });
    }

    return res.sendStatus(202);
  } catch (err: unknown) {
    logger.error("Outlook webhook error:", { err });
    return res.sendStatus(202);
  }
});

export default router;
