import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import { mailboxConnectionQueue } from "../queues/handle-mailbox-connection.queue";
import { webhookQueue } from "../queues/handle-webhook.queue";
import { gmailSyncQueue } from "../queues/sync-gmail.queue";
import { outlookSyncQueue } from "../queues/sync-outlook.queue";

// Create Express adapter with custom UI config
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

export const bullBoard = createBullBoard({
  queues: [
    new BullMQAdapter(mailboxConnectionQueue),
    new BullMQAdapter(webhookQueue),
    new BullMQAdapter(gmailSyncQueue),
    new BullMQAdapter(outlookSyncQueue),
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
      miscLinks: [
        { text: "Documentation", url: "https://docs.bullmq.io" },
      ],
      favIcon: {
        default: "/logos/logo-black.svg",
        alternative: "static/favicon.ico",
      },
    },
  },
});



export default serverAdapter;
