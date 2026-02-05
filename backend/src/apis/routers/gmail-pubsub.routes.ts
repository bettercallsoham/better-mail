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

export default router;
