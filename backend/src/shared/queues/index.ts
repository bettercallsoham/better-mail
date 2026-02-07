export { gmailWebhookQueue, outlookWebhookQueue } from "./handle-webhook.queue";

export { gmailSyncQueue } from "./sync-gmail.queue";

export { outlookSyncQueue } from "./sync-outlook.queue";

export const QUEUE_NAMES = {
  MAILBOX_CONNECTION: "mailbox-connection",
  GMAIL_WEBHOOK: "gmail-webhook",
  OUTLOOK_WEBHOOK: "outlook-webhook",
  GMAIL_SYNC: "gmail-sync",
  OUTLOOK_SYNC: "outlook-sync",
} as const;
