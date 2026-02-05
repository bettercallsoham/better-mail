import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { EmailAccount } from "../shared/models";
import { GmailApiService } from "../shared/services/gmail/gmail-api.service";
import { OutlookApiService } from "../shared/services/outlook/outlook-api.service";
import { logger } from "../shared/utils/logger";

interface MailboxConnectionData {
  accountId: string;
  email: string;
  provider: "google" | "outlook";
}

interface SubscriptionResult {
  subscriptionId: string;
  expiresAt: Date;
}

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

async function setupGmailWatch(email: string): Promise<SubscriptionResult> {
  const gmailService = new GmailApiService({ email });
  const watchResponse = await gmailService.watchMailbox();

  const expiresAt = new Date(parseInt(watchResponse.expiration));

  // Cache history ID for incremental sync
  await redis.setex(
    `gmail:historyId:${email}`,
    SEVEN_DAYS_IN_SECONDS,
    watchResponse.historyId,
  );

  logger.info(
    `Gmail watch setup for ${email}, expires ${expiresAt.toISOString()}`,
  );

  return {
    subscriptionId: watchResponse.historyId,
    expiresAt,
  };
}

async function setupOutlookSubscription(
  email: string,
): Promise<SubscriptionResult> {
  const outlookService = new OutlookApiService({ email });
  const subscription = await outlookService.createEmailSubscription();

  const expiresAt = new Date(subscription.expirationDateTime);

  logger.info(
    `Outlook subscription ${subscription.isExisting ? "exists" : "created"} for ${email}`,
  );

  return {
    subscriptionId: subscription.subscriptionId,
    expiresAt,
  };
}

async function cacheSubscriptionDetails(
  provider: string,
  email: string,
  accountId: string,
  subscriptionId: string,
  expiresAt: Date,
): Promise<void> {
  await redis.setex(
    `${provider}:subscription:${email}`,
    SEVEN_DAYS_IN_SECONDS,
    JSON.stringify({
      subscriptionId,
      expiresAt: expiresAt.toISOString(),
      accountId,
    }),
  );
}

async function processMailboxConnection(job: Job<MailboxConnectionData>) {
  const { accountId, email, provider } = job.data;

  logger.info(`Processing mailbox connection: ${email} (${provider})`);

  const emailAccount = await EmailAccount.findOne({
    where: { id: accountId, email: email.toLowerCase() },
  });

  if (!emailAccount) {
    throw new Error(`Email account not found: ${accountId}`);
  }

  // Setup subscription based on provider
  const { subscriptionId, expiresAt } =
    provider === "google"
      ? await setupGmailWatch(email)
      : await setupOutlookSubscription(email);

  // Update database
  await emailAccount.update({
    subscription_id: subscriptionId,
    subscription_expiration: expiresAt,
  });

  // Cache subscription details
  await cacheSubscriptionDetails(
    provider,
    email,
    accountId,
    subscriptionId,
    expiresAt,
  );

  logger.info(`Subscription saved for ${email}`);

  // TODO: Fetch last 30 days emails

  return {
    success: true,
    accountId,
    email,
    provider,
    subscriptionId,
    expiresAt: expiresAt.toISOString(),
  };
}

export const handleMailboxConnectionWorker = new Worker<MailboxConnectionData>(
  "mailbox-connection",
  processMailboxConnection,
  {
    connection: redis as any,
    concurrency: 5,
  },
);

handleMailboxConnectionWorker.on("completed", (job) => {
  logger.info(`Mailbox connection completed: ${job.data.email}`);
});

handleMailboxConnectionWorker.on("failed", (job, err) => {
  logger.error(
    `Mailbox connection failed: ${job?.data.email} - ${err.message}`,
  );
});
