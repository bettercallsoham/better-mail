import { logger } from "../../utils/logger";
import { UnifiedEmailDocument } from "../../services/elastic/interface";
import { GmailMessage } from "../../services/gmail/interfaces";

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (error) {
    logger.error("Failed to decode base64url:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

function extractGmailBody(payload: any): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const body = extractGmailBody(part);
        if (body) return body;
      }
    }
  }

  return "";
}

export function transformGmailToUnified(
  msg: GmailMessage,
  emailAddress: string,
  isWebhook: boolean = false,
): UnifiedEmailDocument {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    "";

  const doc: UnifiedEmailDocument = {
    id: msg.id,
    emailAddress,
    provider: "gmail",
    providerMessageId: msg.id,
    providerThreadId: msg.threadId,

    threadId: msg.threadId,
    isThreadRoot: false,

    receivedAt: new Date(parseInt(msg.internalDate)).toISOString(),
    sentAt: new Date(parseInt(msg.internalDate)).toISOString(),
    indexedAt: new Date().toISOString(),

    from: { email: getHeader("From") },
    to: [{ email: getHeader("To") }],
    cc: [],
    bcc: [],

    subject: getHeader("Subject"),
    snippet: msg.snippet || "",
    bodyHtml: extractGmailBody(msg.payload),
    searchText: `${getHeader("Subject")} ${msg.snippet}`,

    hasAttachments: msg.payload?.parts?.some((p) => p.filename) || false,
    attachments: [],

    isRead: !msg.labelIds?.includes("UNREAD"),
    isStarred: msg.labelIds?.includes("STARRED") || false,
    isArchived: !msg.labelIds?.includes("INBOX"),
    isDeleted: msg.labelIds?.includes("TRASH") || false,

    isDraft: false,

    labels: msg.labelIds || [],
    providerLabels: msg.labelIds || [],
  };

  // Only set inboxState for webhook emails (new arrivals)
  if (isWebhook) {
    doc.inboxState = "INBOX";
  }

  return doc;
}
