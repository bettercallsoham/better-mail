import axios, { AxiosInstance } from "axios";
import "dotenv/config";
import redis from "../../config/redis";
import { EmailAccount } from "../../models";
import { GmailMessage, SendEmailInput } from "./interfaces";
import { Rfc822Builder } from "../RFC.service";
import { logger } from "@sentry/node";
import { scheduleSubscriptionRenewal } from "../../queues/email-subscription.queue";
import { chunkArray, parseMultipartResponse } from "../../utils/multipart.util";

export interface EmailBody {
  bodyHtml: string | null;
  bodyText: string | null;
}

const GMAIL_BATCH_URL = "https://www.googleapis.com/batch/gmail/v1";
const GMAIL_BATCH_SIZE = 50;

export class GmailApiService {
  private client?: AxiosInstance;
  private email: string;

  constructor({ email }: { email: string }) {
    this.email = email.toLowerCase();
  }

  private async refreshAccessToken(refreshToken: string) {
    const res = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    return {
      accessToken: res.data.access_token,
      expiresIn: res.data.expires_in,
    };
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = `gmail:access_token:${this.email}`;

    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const account = await EmailAccount.findOne({
      where: { email: this.email },
      attributes: ["refresh_token"],
    });

    if (!account?.refresh_token) {
      throw new Error("Missing Gmail refresh token");
    }

    const { accessToken, expiresIn } = await this.refreshAccessToken(
      account.refresh_token,
    );

    await redis.set(cacheKey, accessToken, "EX", Math.max(expiresIn - 60, 60));

    return accessToken;
  }

  private async getClient(): Promise<AxiosInstance> {
    if (this.client) return this.client;

    const accessToken = await this.getAccessToken();

    this.client = axios.create({
      baseURL: "https://gmail.googleapis.com/gmail/v1",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return this.client;
  }

  /* ===================== CORE FETCH LOGIC ===================== */

  public async *iterateMessageIds(days: number) {
    const client = await this.getClient();

    const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

    let pageToken: string | undefined;

    do {
      const res = await client.get("/users/me/messages", {
        params: {
          q: `after:${after}`,
          maxResults: 100,
          pageToken,
        },
      });

      for (const msg of res.data.messages ?? []) {
        yield msg.id;
      }

      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }

  /**
   * Fetch messages changed since a given historyId
   * Used after receiving Gmail push notification
   */
  public async fetchHistorySince(
    startHistoryId: string | number,
    onMessage?: (msg: GmailMessage) => Promise<void>,
  ): Promise<GmailMessage[]> {
    const client = await this.getClient();

    let pageToken: string | undefined;
    const messages: GmailMessage[] = [];
    const seenMessageIds = new Set<string>();

    do {
      const res = await client.get("/users/me/history", {
        params: {
          startHistoryId,
          historyTypes: ["messageAdded"],
          maxResults: 100,
          pageToken,
        },
      });

      for (const h of res.data.history ?? []) {
        for (const item of h.messagesAdded ?? []) {
          const messageId = item.message?.id;
          if (!messageId || seenMessageIds.has(messageId)) continue;

          seenMessageIds.add(messageId);

          const msg = await this.fetchMessage(messageId);

          if (!msg) continue;

          if (onMessage) {
            await onMessage(msg);
          } else {
            messages.push(msg);
          }
        }
      }

      pageToken = res.data.nextPageToken;
    } while (pageToken);

    return messages;
  }

  public async watchMailbox(): Promise<{
    historyId: string;
    expiration: string;
  }> {
    const client = await this.getClient();

    const res = await client.post("/users/me/watch", {
      topicName: process.env.GMAIL_PUBSUB_TOPIC!,
      labelIds: ["INBOX"],
      labelFilterAction: "include",
    });

    await scheduleSubscriptionRenewal({
      email: this.email,
      provider: "gmail",
      expiresAt: new Date(parseInt(res.data.expiration)),
    });

    return {
      historyId: res.data.historyId,
      expiration: res.data.expiration,
    };
  }

  public async fetchMessage(messageId: string): Promise<GmailMessage | null> {
    const client = await this.getClient();

    try {
      const res = await client.get(`/users/me/messages/${messageId}`, {
        params: { format: "full" },
      });

      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn(`Message not found: ${messageId}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch ALL Gmail emails from last N days (all folders)
   */
  public async fetchLastNDaysEmails(
    days = 30,
    onMessage?: (msg: GmailMessage) => Promise<void>,
  ): Promise<boolean> {
    for await (const messageId of this.iterateMessageIds(days)) {
      const message = await this.fetchMessage(messageId);

      if (!message) continue;

      if (onMessage) {
        await onMessage(message);
      }
    }

    return true;
  }

  /* ===================== BODY EXTRACTION ===================== */

  private extractBodyFromPayload(payload: any): {
    bodyHtml: string | null;
    bodyText: string | null;
  } {
    let bodyHtml: string | null = null;
    let bodyText: string | null = null;

    const walk = (part: any) => {
      if (!part) return;

      if (part.mimeType === "text/html" && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = Buffer.from(part.body.data, "base64").toString("utf-8");
      }

      // Simple body (not multipart)
      if (
        !part.mimeType?.startsWith("multipart/") &&
        part.body?.data &&
        !bodyHtml &&
        !bodyText
      ) {
        const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
        if (part.mimeType === "text/html") bodyHtml = decoded;
        else bodyText = decoded;
      }

      // Recurse into parts
      if (part.parts) {
        for (const child of part.parts) {
          walk(child);
        }
      }
    };

    walk(payload);

    return { bodyHtml, bodyText };
  }

  /**
   * Fetch only the body of a single message by providerMessageId.
   * Used by the batch-bodies endpoint and embeddings worker.
   * Nothing is stored — caller is responsible for discarding after use.
   */
  public async fetchMessageBody(providerMessageId: string): Promise<EmailBody> {
    const msg = await this.fetchMessage(providerMessageId);

    if (!msg) {
      return { bodyHtml: null, bodyText: null };
    }

    return this.extractBodyFromPayload(msg.payload);
  }

  /**
   * Fetches all messages in a Gmail thread in a single API call.
   * Extracts bodies from payload — nothing stored.
   */
  public async fetchThreadBodies(
    providerThreadId: string,
  ): Promise<Map<string, EmailBody>> {
    const client = await this.getClient();

    const res = await client.get(`/users/me/threads/${providerThreadId}`, {
      params: {
        format: "full",
        fields: "messages(id,payload)",
      },
    });

    const results = new Map<string, EmailBody>();

    for (const msg of res.data.messages ?? []) {
      results.set(msg.id, this.extractBodyFromPayload(msg.payload));
    }

    return results;
  }

  // ─── Batch message bodies (multipart HTTP batch, 1 round trip per 50) ─────────

  /**
   * Fetches bodies for arbitrary message IDs using Gmail's multipart batch API.
   * Reduces N round trips to ceil(N/50) with full parallelism across chunks.
   */
  public async fetchMessageBodies(
    providerMessageIds: string[],
  ): Promise<Map<string, EmailBody>> {
    if (providerMessageIds.length === 0) return new Map();

    const accessToken = await this.getAccessToken();
    const chunks = chunkArray(providerMessageIds, GMAIL_BATCH_SIZE);

    const chunkResults = await Promise.all(
      chunks.map((chunk) => this.fetchMessageBodiesChunk(chunk, accessToken)),
    );

    return new Map(chunkResults.flatMap((m) => [...m]));
  }

  private async fetchMessageBodiesChunk(
    messageIds: string[],
    accessToken: string,
  ): Promise<Map<string, EmailBody>> {
    const boundary = `batch_${crypto.randomUUID().replace(/-/g, "")}`;

    const bodyParts = messageIds
      .map((id) =>
        [
          `--${boundary}`,
          `Content-Type: application/http`,
          `Content-ID: <${id}>`,
          ``,
          `GET /gmail/v1/users/me/messages/${id}?format=full&fields=id,payload HTTP/1.1`,
          ``,
        ].join("\r\n"),
      )
      .join("\r\n");

    const requestBody = `${bodyParts}\r\n--${boundary}--`;

    const res = await axios.post(GMAIL_BATCH_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
      responseType: "text",
    });

    return this.parseGmailBatchResponse(
      res.data as string,
      res.headers["content-type"],
    );
  }

  private parseGmailBatchResponse(
    rawBody: string,
    contentTypeHeader: string,
  ): Map<string, EmailBody> {
    const results = new Map<string, EmailBody>();
    const parts = parseMultipartResponse(rawBody, contentTypeHeader);

    for (const { contentId, body } of parts) {
      const messageId = contentId?.replace(/^<response-|>$/g, "");
      if (!messageId) continue;

      const jsonStart = body.indexOf("{");

      if (jsonStart === -1) {
        results.set(messageId, { bodyHtml: null, bodyText: null });
        continue;
      }

      try {
        const msg = JSON.parse(body.slice(jsonStart)) as GmailMessage;
        results.set(messageId, this.extractBodyFromPayload(msg.payload));
      } catch {
        results.set(messageId, { bodyHtml: null, bodyText: null });
      }
    }

    return results;
  }
  /* ===================== REPLY HELPERS ===================== */

  private resolveRecipients(mode: "reply" | "reply_all", ctx: any, me: string) {
    if (mode === "reply") {
      return {
        to: [ctx.replyTo || ctx.from],
        cc: [],
      };
    }

    const to = new Set<string>();
    const cc = new Set<string>();

    const allRecipients = [
      ...(ctx.to ? ctx.to.split(",").map((e: string) => e.trim()) : []),
      ...(ctx.cc ? ctx.cc.split(",").map((e: string) => e.trim()) : []),
    ];

    allRecipients.forEach((email) => {
      if (email && !email.toLowerCase().includes(me.split("@")[0])) {
        cc.add(email);
      }
    });

    to.add(ctx.replyTo || ctx.from);

    return {
      to: [...to],
      cc: [...cc],
    };
  }

  private async getReplyContext(messageId: string) {
    const msg = await this.fetchMessage(messageId);

    if (!msg) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const headers = msg.payload.headers.reduce((acc: any, h: any) => {
      acc[h.name.toLowerCase()] = h.value;
      return acc;
    }, {});

    return {
      threadId: msg.threadId,
      messageId: headers["message-id"],
      references: headers["references"] ? headers["references"].split(" ") : [],
      from: headers["from"],
      to: headers["to"],
      cc: headers["cc"],
      replyTo: headers["reply-to"],
      subject: headers["subject"],
      date: headers["date"],
    };
  }

  private extractEmailBody(payload: any): string {
    const { bodyHtml, bodyText } = this.extractBodyFromPayload(payload);
    return bodyHtml ?? bodyText?.replace(/\n/g, "<br>") ?? "";
  }

  public async sendEmail(input: SendEmailInput): Promise<string> {
    const client = await this.getClient();

    let threadId: string | undefined;
    let inReplyTo: string | undefined;
    let references: string[] | undefined;
    let to = input.to ?? [];
    let cc = input.cc ?? [];
    let subject = input.subject;
    let html = input.html;

    if (input.mode !== "new") {
      const ctx = await this.getReplyContext(input.replyToMessageId!);

      threadId = ctx.threadId;
      inReplyTo = ctx.messageId;
      references = [...ctx.references, ctx.messageId];

      if (input.mode === "reply" || input.mode === "reply_all") {
        const resolved = this.resolveRecipients(input.mode, ctx, this.email);
        to = resolved.to;
        cc = resolved.cc;
      }

      if (!subject) {
        if (input.mode === "forward") {
          subject = ctx.subject?.startsWith("Fwd:")
            ? ctx.subject
            : `Fwd: ${ctx.subject}`;
        } else {
          subject = ctx.subject?.startsWith("Re:")
            ? ctx.subject
            : `Re: ${ctx.subject}`;
        }
      }

      if (input.mode === "forward") {
        const msg = await this.fetchMessage(input.replyToMessageId!);

        if (!msg) {
          throw new Error(
            `Message not found for forwarding: ${input.replyToMessageId}`,
          );
        }

        const originalBody = this.extractEmailBody(msg.payload);

        html = `
          ${input.html}
          <br><br>
          <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-top: 20px;">
            <p style="color: #666;">---------- Forwarded message ---------</p>
            <p><strong>From:</strong> ${ctx.from}</p>
            <p><strong>Date:</strong> ${ctx.date}</p>
            <p><strong>Subject:</strong> ${ctx.subject}</p>
            <p><strong>To:</strong> ${ctx.to}</p>
            ${ctx.cc ? `<p><strong>Cc:</strong> ${ctx.cc}</p>` : ""}
            <br>
            ${originalBody}
          </div>
        `;
      }
    }

    const raw = Rfc822Builder.build({
      from: input.from,
      to,
      cc,
      bcc: input.bcc,
      subject: subject ?? "(no subject)",
      html,
      inReplyTo,
      references,
      attachments: input.attachments,
    });

    const res = await client.post("/users/me/messages/send", {
      raw: Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_"),
      threadId,
    });

    return res.data.id;
  }

  private async modifyMessages(params: {
    messageIds: string[];
    addLabels?: string[];
    removeLabels?: string[];
  }): Promise<void> {
    const client = await this.getClient();

    await client.post("/users/me/messages/batchModify", {
      ids: params.messageIds,
      addLabelIds: params.addLabels,
      removeLabelIds: params.removeLabels,
    });
  }

  async markRead(messageIds: string[]): Promise<void> {
    await this.modifyMessages({ messageIds, removeLabels: ["UNREAD"] });
  }

  async markUnread(messageIds: string[]): Promise<void> {
    await this.modifyMessages({ messageIds, addLabels: ["UNREAD"] });
  }

  async archive(messageIds: string[]): Promise<void> {
    await this.modifyMessages({ messageIds, removeLabels: ["INBOX"] });
  }

  async unarchive(messageIds: string[]): Promise<void> {
    await this.modifyMessages({ messageIds, addLabels: ["INBOX"] });
  }

  async trash(messageIds: string[]): Promise<void> {
    await this.modifyMessages({
      messageIds,
      addLabels: ["TRASH"],
      removeLabels: ["INBOX"],
    });
  }

  async restoreFromTrash(messageIds: string[]): Promise<void> {
    await this.modifyMessages({
      messageIds,
      removeLabels: ["TRASH"],
      addLabels: ["INBOX"],
    });
  }

  async star(messageIds: string[]): Promise<void> {
    await this.modifyMessages({ messageIds, addLabels: ["STARRED"] });
  }

  async unstar(messageIds: string[]): Promise<void> {
    await this.modifyMessages({ messageIds, removeLabels: ["STARRED"] });
  }

  async applyLabel(messageIds: string[], labelId: string): Promise<void> {
    await this.modifyMessages({ messageIds, addLabels: [labelId] });
  }

  async removeLabel(messageIds: string[], labelId: string): Promise<void> {
    await this.modifyMessages({ messageIds, removeLabels: [labelId] });
  }

  async createLabel(name: string): Promise<string> {
    const client = await this.getClient();

    const res = await client.post("/users/me/labels", {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    });

    return res.data.id;
  }

  /* ===================== DRAFT OPERATIONS ===================== */

  async createDraft(input: SendEmailInput): Promise<string> {
    const client = await this.getClient();

    const raw = Rfc822Builder.build({
      from: this.email,
      to: input.to || [],
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject || "",
      html: input.html || input.text || "",
    });

    const res = await client.post("/users/me/drafts", {
      message: {
        raw: Buffer.from(raw)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
      },
    });

    return res.data.id;
  }

  async updateDraft(draftId: string, input: SendEmailInput): Promise<void> {
    const client = await this.getClient();

    const raw = Rfc822Builder.build({
      from: this.email,
      to: input.to || [],
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject || "",
      html: input.html || input.text || "",
    });

    await client.put(`/users/me/drafts/${draftId}`, {
      message: {
        raw: Buffer.from(raw)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
      },
    });
  }

  async deleteDraft(draftId: string): Promise<void> {
    const client = await this.getClient();
    await client.delete(`/users/me/drafts/${draftId}`);
  }

  async sendDraft(draftId: string): Promise<string> {
    const client = await this.getClient();

    try {
      const res = await client.post(`/users/me/drafts/send`, {
        id: draftId,
      });

      return res.data.id;
    } catch (error: any) {
      logger.error("Gmail sendDraft error:", {
        draftId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  }

  async getDraft(draftId: string): Promise<any> {
    const client = await this.getClient();
    const res = await client.get(`/users/me/drafts/${draftId}`, {
      params: { format: "full" },
    });
    return res.data;
  }
}

