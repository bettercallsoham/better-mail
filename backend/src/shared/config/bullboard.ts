import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import { handleMailboxConnectionQueue } from "../queues/handle-mailbox-connection";
import {
  gmailWebhookQueue,
  outlookWebhookQueue,
} from "../queues/handle-webhook.queue";
import { gmailSyncQueue } from "../queues/sync-gmail.queue";
import { outlookSyncQueue } from "../queues/sync-outlook.queue";
import { conversationEmbeddingsQueue, searchHistoryQueue } from "../queues";
import { embeddingsQueue } from "../queues/generate-embeddings.queue";
import { conversationQueue } from "../queues/conversation.queue";
import { emailSubscriptionQueue } from "../queues/email-subscription.queue";

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

export const bullBoard = createBullBoard({
  queues: [
    new BullMQAdapter(handleMailboxConnectionQueue),
    new BullMQAdapter(gmailWebhookQueue),
    new BullMQAdapter(outlookWebhookQueue),
    new BullMQAdapter(gmailSyncQueue),
    new BullMQAdapter(outlookSyncQueue),
    new BullMQAdapter(searchHistoryQueue),
    new BullMQAdapter(embeddingsQueue),
    new BullMQAdapter(conversationQueue),
    new BullMQAdapter(conversationEmbeddingsQueue),
    new BullMQAdapter(emailSubscriptionQueue),
  ],
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      boardTitle: "BetterMail",
      boardLogo: {
        path: "/logos/logo-white.png",
        width: "50px",
        height: "50px",
      },
      miscLinks: [{ text: "Documentation", url: "https://docs.bullmq.io" }],
      favIcon: {
        default: "/logos/logo-black.svg",
        alternative: "static/favicon.ico",
      },
    },
  },
});

export default serverAdapter;
