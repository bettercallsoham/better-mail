import { Router } from "express";
import redis from "../../shared/config/redis";
import { GmailApiService } from "../../shared/services/gmail/gmail-api.service";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const message = req.body?.message;

    console.log("-----------------------WEBHOOK RECIEVED----------------");
    console.dir(req.body);

    if (!message?.data) {
      console.log("No data in Pub/Sub message");
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

    await redis.set(`history-id-${emailAddress}`, historyId);

    const gs = new GmailApiService({ email: emailAddress });

    const result = await gs.fetchHistorySince(lastHistoryId);

    console.log(result);

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

router.post("/outlook", async (req, res) => {
  try {
    // 1️⃣ Validation handshake (MANDATORY)
    if (req.query.validationToken) {
      console.log("🔐 Outlook webhook validation");
      return res.status(200).send(req.query.validationToken);
    }

    console.log(
      "----------------------- OUTLOOK WEBHOOK RECEIVED -----------------------",
    );
    console.dir(req.body, { depth: null });

    const notifications = req.body?.value;

    if (!Array.isArray(notifications)) {
      return res.sendStatus(202);
    }

    for (const n of notifications) {
      // 2️⃣ Security check
      if (n.clientState !== process.env.OUTLOOK_CLIENT_STATE) {
        console.warn("❌ Invalid clientState, ignoring");
        continue;
      }

      const messageId = n.resourceData?.id;
      const conversationId = n.resourceData?.conversationId;

      if (!messageId) {
        continue;
      }

      console.log("📨 Outlook message change", {
        changeType: n.changeType,
        messageId,
        conversationId,
      });

      /**
       * IMPORTANT:
       * Do NOT fetch the email here.
       * Enqueue a job instead.
       *
       * queue.add("fetch-outlook-message", {
       *   messageId,
       *   subscriptionId: n.subscriptionId
       * });
       */
    }

    // 3️⃣ Always ACK fast
    return res.sendStatus(202);
  } catch (err) {
    console.error("🔥 Outlook webhook error:", err);
    // NEVER return non-2xx or Graph will retry
    return res.sendStatus(202);
  }
});

export default router;
