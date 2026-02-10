import { logger } from "../../utils/logger";
import { UnifiedEmailDocument } from "../../services/elastic/interface";
import { GmailMessage } from "../../services/gmail/interfaces";

/**
 * Parse RFC format email string like:
 * - "Name <email@example.com>"
 * - "email@example.com"
 * - "<email@example.com>"
 */
function parseEmailAddress(raw: string): { email: string; name?: string } {
  if (!raw) return { email: "" };

  const trimmed = raw.trim();

  // First, try to match format with name: "Name <email@example.com>"
  const withNameMatch = trimmed.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/);
  if (withNameMatch) {
    return {
      email: withNameMatch[2].trim(),
      name: withNameMatch[1].trim(),
    };
  }

  // Then try to match plain email or <email@example.com>
  const plainEmailMatch = trimmed.match(/^<?([^\s<>]+@[^\s<>]+)>?$/);
  if (plainEmailMatch) {
    return { email: plainEmailMatch[1].trim() };
  }

  // Fallback: treat entire string as email
  return { email: trimmed };
}

/**
 * Parse multiple email addresses separated by commas
 */
function parseEmailList(raw: string): Array<{ email: string; name?: string }> {
  if (!raw) return [];

  // Split by comma, but not commas inside quotes
  const emails: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "," && !inQuotes) {
      if (current.trim()) emails.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) emails.push(current.trim());

  return emails.map(parseEmailAddress).filter((e) => e.email);
}

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

    from: parseEmailAddress(getHeader("From")),
    to: parseEmailList(getHeader("To")),
    cc: parseEmailList(getHeader("Cc")),
    bcc: parseEmailList(getHeader("Bcc")),

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
