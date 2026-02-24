import { Queue } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

export interface EmailSubscriptionJobData {
  email: string;
  provider: "gmail" | "outlook";
  subscriptionId?: string; // outlook only
}

export const emailSubscriptionQueue = new Queue<EmailSubscriptionJobData>(
  "email-subscription",
  {
    connection: redis as any,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  },
);

const BUFFER_MS = 12 * 60 * 60 * 1000;

export async function scheduleSubscriptionRenewal({
  email,
  provider,
  expiresAt,
  subscriptionId,
}: {
  email: string;
  provider: "gmail" | "outlook";
  expiresAt: Date;
  subscriptionId?: string;
}) {
  const delay = Math.max(expiresAt.getTime() - Date.now() - BUFFER_MS, 0);

  const jobId = `renew-${provider}-${email}`;

  const existingJob = await emailSubscriptionQueue.getJob(jobId);
  if (existingJob) await existingJob.remove();

  await emailSubscriptionQueue.add(
    "renew-subscription",
    { email, provider, subscriptionId },
    {
      delay,
      jobId,
    },
  );

  logger.info(
    `Scheduled ${provider} renewal for ${email} in ${Math.round(delay / 1000 / 60 / 60)}h (fires at ${new Date(Date.now() + delay).toISOString()})`,
  );
}
