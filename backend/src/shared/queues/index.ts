export { webhookQueue } from "./handle-webhook.queue";

export { gmailSyncQueue } from "./sync-gmail.queue";

export { outlookSyncQueue } from "./sync-outlook.queue";

export const QUEUE_NAMES = {
  MAILBOX_CONNECTION: "mailbox-connection",
  WEBHOOK_PROCESSING: "webhook-processing",
  GMAIL_SYNC: "gmail-sync",
  OUTLOOK_SYNC: "outlook-sync",
} as const;
