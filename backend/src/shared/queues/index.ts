/**
 * Central export file for all queue instances
 * Import from here to use queues throughout the application
 */

export {
  mailboxConnectionQueue,
  mailboxConnectionWorker,
} from "./handle-mailbox-connection.queue";

export { webhookQueue, webhookWorker } from "./handle-webhook.queue";

export { gmailSyncQueue, gmailSyncWorker } from "./sync-gmail.queue";

export { outlookSyncQueue, outlookSyncWorker } from "./sync-outlook.queue";

// Queue names for reference
export const QUEUE_NAMES = {
  MAILBOX_CONNECTION: "mailbox-connection",
  WEBHOOK_PROCESSING: "webhook-processing",
  GMAIL_SYNC: "gmail-sync",
  OUTLOOK_SYNC: "outlook-sync",
} as const;
