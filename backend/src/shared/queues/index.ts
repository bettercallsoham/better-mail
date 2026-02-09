export { gmailWebhookQueue, outlookWebhookQueue } from "./handle-webhook.queue";

export { gmailSyncQueue } from "./sync-gmail.queue";

export { outlookSyncQueue } from "./sync-outlook.queue";

export { searchHistoryQueue } from "./search-history.queue";

export const QUEUE_NAMES = {
  MAILBOX_CONNECTION: "mailbox-connection",
  GMAIL_WEBHOOK: "gmail-webhook",
  OUTLOOK_WEBHOOK: "outlook-webhook",
  GMAIL_SYNC: "gmail-sync",
  OUTLOOK_SYNC: "outlook-sync",
  SEARCH_HISTORY: "search-history",
} as const;
