import axios from "axios";
import redis from "../../config/redis";
import "dotenv/config";
import { UnifiedEmailDocument } from "../../services/elastic/interface";
import { OutlookMessage } from "../../services/outlook/interfaces";

export function transformOutlookToUnified(
  msg: OutlookMessage,
  mailboxId: string,
): UnifiedEmailDocument {
  const parseAddress = (addr: any) => ({
    name: addr?.emailAddress?.name,
    email: addr?.emailAddress?.address || "",
  });

  return {
    id: msg.id,
    provider: "outlook",
    providerMessageId: msg.id,
    providerThreadId: msg.conversationId || msg.id,
    mailboxId,

    threadId: msg.conversationId || msg.id,
    isThreadRoot: false,

    receivedAt: msg.receivedDateTime,
    sentAt: msg.sentDateTime || msg.receivedDateTime,
    indexedAt: new Date().toISOString(),

    from: parseAddress(msg.from),
    to: (msg.toRecipients || []).map(parseAddress),
    cc: (msg.ccRecipients || []).map(parseAddress),
    bcc: [],

    subject: msg.subject || "",
    snippet: msg.bodyPreview || "",
    bodyHtml: msg.body?.content || "",
    searchText: `${msg.subject} ${msg.bodyPreview}`,

    hasAttachments: msg.hasAttachments || false,
    attachments: [],

    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,

    labels: [],
    providerLabels: [],
  };
}

const tenantId = process.env.MICROSOFT_TENANT_ID;
if (!tenantId) {
  throw new Error("Tenant Id is missing");
}
const TOKEN_URL = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
export async function refreshOutlookAccessToken({
  emailAccountId,
  refreshToken,
}: {
  emailAccountId: string;
  refreshToken: string;
}) {
  // const cacheKey = `outlook:access_token:${emailAccountId}`;

  // const cachedToken = await redis.get(cacheKey);
  // if (cachedToken) {
  //   return {
  //     access_token: cachedToken,
  //     refresh_token: refreshToken,
  //     source: "cache",
  //   };
  // }

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  const { access_token, refresh_token, expires_in } = response.data;

  // await redis.setex(cacheKey, Math.max(expires_in - 60, 60), access_token);

  return {
    access_token,
    refresh_token: refresh_token ?? refreshToken,
    expires_in,
    source: "oauth",
  };
}
