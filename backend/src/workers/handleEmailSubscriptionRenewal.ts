import { Worker, Job } from "bullmq";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { logger } from "../shared/utils/logger";
import {
  EmailSubscriptionJobData,
  scheduleSubscriptionRenewal,
} from "../shared/queues/email-subscription.queue";
import redis from "../shared/config/redis";

async function renewOutlook(data: EmailSubscriptionJobData) {
  const { email, subscriptionId } = data;
  if (!subscriptionId) throw new Error("subscriptionId required for Outlook");

  const svc = new OutlookApiService({ email });

  let result: { subscriptionId: string; expirationDateTime: string };

  try {
    result = await svc.renewSubscription(subscriptionId);
    logger.info(`Renewed Outlook subscription for ${email}`);
  } catch (err: any) {
    if ([400, 404].includes(err?.response?.status)) {
      logger.warn(`Outlook subscription gone for ${email}, recreating...`);
      result = await svc.createEmailSubscription();
    } else if ([401].includes(err?.response?.status)) {
      logger.warn(`Token revoked for ${email} — stopping renewal chain`);
      return;
    } else {
      throw err;
    }
  }

  // Schedule next renewal before new expiry
  await scheduleSubscriptionRenewal({
    email,
    provider: "outlook",
    subscriptionId: result.subscriptionId,
    expiresAt: new Date(result.expirationDateTime),
  });
}

async function renewGmail(data: EmailSubscriptionJobData) {
  const { email } = data;
  const svc = new GmailApiService({ email });

  let historyId: string;
  let expiration: string;

  try {
    const result = await svc.watchMailbox();
    historyId = result.historyId;
    expiration = result.expiration;
    logger.info(`Re-watched Gmail for ${email}`);
  } catch (err: any) {
    if ([400, 401].includes(err?.response?.status)) {
      logger.warn(`Token invalid for ${email} — stopping Gmail renewal chain`);
      return;
    }
    throw err;
  }

  await redis.set(`gmail:history:${email}`, historyId);

  await scheduleSubscriptionRenewal({
    email,
    provider: "gmail",
    expiresAt: new Date(parseInt(expiration)),
  });
}

// ── Worker ────────────────────────────────────────────────────────────────────
export const emailSubscriptionWorker = new Worker<EmailSubscriptionJobData>(
  "email-subscription",
  async (job: Job<EmailSubscriptionJobData>) => {
    if (job.name !== "renew-subscription") {
      logger.warn(`Unknown job: ${job.name}`);
      return;
    }

    const { provider } = job.data;

    if (provider === "outlook") return renewOutlook(job.data);
    if (provider === "gmail") return renewGmail(job.data);

    throw new Error(`Unknown provider: ${provider}`);
  },
  {
    connection: redis as any,
    concurrency: 5,
  },
);

emailSubscriptionWorker.on("completed", (job) =>
  logger.info(
    `✓ Renewal completed for ${job.data.email} [${job.data.provider}]`,
  ),
);
emailSubscriptionWorker.on("failed", (job, err) =>
  logger.error(
    `✗ Renewal failed for ${job?.data.email} [${job?.data.provider}]:`,
    { err },
  ),
);
