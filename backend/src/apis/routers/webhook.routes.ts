import { Router } from "express";
import redis from "../../shared/config/redis";
import { EmailAccount } from "../../shared/models";
import {
  gmailWebhookQueue,
  outlookWebhookQueue,
} from "../../shared/queues/handle-webhook.queue";

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

    const lastHistoryId = await redis.get(`history-id-${emailAddress}`);
    if (!lastHistoryId) {
      await redis.set(`history-id-${emailAddress}`, historyId);
      return res.sendStatus(200);
    }

    // Enqueue webhook job (mailboxId will be queried in worker)
    await gmailWebhookQueue.add("process-gmail-webhook", {
      email: emailAddress,
      historyId,
      lastHistoryId,
    });

    // Update last history ID
    await redis.set(`history-id-${emailAddress}`, historyId);

    return res.sendStatus(200);
  } catch (err) {
    console.error("Gmail webhook error:", err);
    return res.sendStatus(200);
  }
});

router.post("/outlook", async (req, res) => {
  try {
    // Validation handshake
    if (req.query.validationToken) {
      return res.status(200).send(req.query.validationToken);
    }

    const notifications = req.body?.value;

    if (!Array.isArray(notifications)) {
      return res.sendStatus(202);
    }

    for (const n of notifications) {
      // Security check
      if (n.clientState !== process.env.OUTLOOK_CLIENT_STATE) {
        console.warn("Invalid clientState, ignoring");
        continue;
      }

      const messageId = n.resourceData?.id;
      const subscriptionId = n.subscriptionId;

      if (!messageId || !subscriptionId) {
        continue;
      }

      // Get email and mailboxId from cache or DB
      const cacheKey = `subscription:${subscriptionId}`;
      let cached = await redis.get(cacheKey);

      let email: string;
      let mailboxId: string;

      if (cached) {
        const data = JSON.parse(cached);
        email = data.email;
        mailboxId = data.mailboxId;
      } else {
        const account = await EmailAccount.findOne({
          where: { subscription_id: subscriptionId, provider: "outlook" },
        });

        if (!account) {
          console.error(
            `Outlook account not found for subscription: ${subscriptionId}`,
          );
          continue;
        }

        email = account.email;
        mailboxId = account.id;

        // Cache for 1 hour
        await redis.setex(cacheKey, 3600, JSON.stringify({ email, mailboxId }));
      }

      // Enqueue webhook job
      await outlookWebhookQueue.add("process-outlook-webhook", {
        email,
        mailboxId,
        messageId,
      });
    }

    return res.sendStatus(202);
  } catch (err) {
    console.error("Outlook webhook error:", err);
    return res.sendStatus(202);
  }
});

export default router;
