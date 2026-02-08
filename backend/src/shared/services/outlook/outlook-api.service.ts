import axios, { AxiosInstance } from "axios";
import "dotenv/config";
import redis from "../../config/redis";
import { EmailAccount } from "../../models";
import {
  OutlookMessage,
  OutlookAttachment,
  SendEmailInput,
} from "./interfaces";

export class OutlookApiService {
  private client?: AxiosInstance;
  private email: string;
  private folderCache = new Map<string, string>();

  constructor({ email }: { email: string }) {
    this.email = email.toLowerCase();
  }

  /* ===================== TOKEN HANDLING ===================== */

  private async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const res = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return {
      accessToken: res.data.access_token,
      expiresIn: res.data.expires_in,
    };
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = `outlook:access_token:${this.email}`;

    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const account = await EmailAccount.findOne({
      where: {
        email: this.email,
      },
      attributes: ["refresh_token"],
    });

    if (!account?.refresh_token) {
      throw new Error("Missing Outlook refresh token");
    }

    const { accessToken, expiresIn } = await this.refreshAccessToken(
      account.refresh_token,
    );

    await redis.set(cacheKey, accessToken, "EX", Math.max(expiresIn - 60, 60));

    return accessToken;
  }

  public async createEmailSubscription() {
    // Check if a valid subscription already exists in the database
    const account = await EmailAccount.findOne({
      where: { email: this.email },
    });

    if (!account) {
      throw new Error(`Email account not found: ${this.email}`);
    }

    // If subscription exists and hasn't expired, return it
    if (
      account.subscription_id &&
      account.subscription_expiration &&
      new Date(account.subscription_expiration) > new Date()
    ) {
      return {
        subscriptionId: account.subscription_id,
        expirationDateTime: account.subscription_expiration.toISOString(),
        resource: "me/messages",
        isExisting: true,
      };
    }

    // If subscription exists but expired, try to delete it from Microsoft
    if (account.subscription_id) {
      try {
        await this.deleteSubscription(account.subscription_id);
      } catch (error) {
        console.warn(
          `Failed to delete expired subscription ${account.subscription_id}:`,
          error,
        );
      }
    }

    // Create new subscription
    const client = await this.getClient();

    const expirationDate = new Date(
      Date.now() + 6 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let res;
    try {
      res = await client.post(
        "/subscriptions",
        {
          changeType: "created,updated",
          resource: "me/messages",
          notificationUrl: process.env.OUTLOOK_WEBHOOK_URL,
          expirationDateTime: expirationDate,
          clientState: process.env.OUTLOOK_CLIENT_STATE,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error: any) {
      console.error("Outlook subscription creation error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        request: {
          changeType: "created,updated",
          resource: "me/messages",
          notificationUrl: process.env.OUTLOOK_WEBHOOK_URL,
          expirationDateTime: expirationDate,
          clientState: process.env.OUTLOOK_CLIENT_STATE,
        },
      });
      throw error;
    }

    // Save subscription details to database
    await account.update({
      subscription_id: res.data.id,
      subscription_expiration: new Date(res.data.expirationDateTime),
    });

    return {
      subscriptionId: res.data.id,
      expirationDateTime: res.data.expirationDateTime,
      resource: res.data.resource,
      isExisting: false,
    };
  }

  public async renewSubscription(subscriptionId: string) {
    const client = await this.getClient();

    const newExpiration = new Date(
      Date.now() + 6 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const res = await client.patch(`/subscriptions/${subscriptionId}`, {
      expirationDateTime: newExpiration,
    });

    // Update expiration time in database
    await EmailAccount.update(
      {
        subscription_expiration: new Date(res.data.expirationDateTime),
      },
      {
        where: {
          email: this.email,
          subscription_id: subscriptionId,
        },
      },
    );

    return {
      subscriptionId: res.data.id,
      expirationDateTime: res.data.expirationDateTime,
    };
  }

  private async getClient(): Promise<AxiosInstance> {
    if (this.client) return this.client;

    const accessToken = await this.getAccessToken();

    this.client = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return this.client;
  }

  /* ===================== ATTACHMENT HANDLING ===================== */

  /**
   * Fetch attachment metadata for a specific message
   */
  public async fetchMessageAttachments(
    messageId: string,
  ): Promise<OutlookAttachment[]> {
    const client = await this.getClient();

    try {
      const res = await client.get(`/me/messages/${messageId}/attachments`);
      return res.data.value || [];
    } catch (error) {
      console.error(
        `Failed to fetch attachments for message ${messageId}:`,
        error,
      );
      return [];
    }
  }

  /* ===================== CORE ITERATOR ===================== */

  /**
   * Fetch a single message by ID
   */
  public async fetchMessageById(
    messageId: string,
  ): Promise<OutlookMessage | null> {
    const client = await this.getClient();

    try {
      const res = await client.get(`/me/messages/${messageId}`);
      return res.data as OutlookMessage;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`Message not found: ${messageId}`);
        return null;
      }
      throw error;
    }
  }

  private async *iterateMessages(days: number, includeAttachments = false) {
    const client = await this.getClient();

    const sinceDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    let url =
      `/me/messages` +
      `?$filter=receivedDateTime ge ${sinceDate}` +
      `&$orderby=receivedDateTime DESC` +
      `&$top=50`;

    while (url) {
      const res = await client.get(url);

      for (const message of res.data.value ?? []) {
        // If message has attachments and we want to include metadata
        if (includeAttachments && message.hasAttachments) {
          message.attachments = await this.fetchMessageAttachments(message.id);
        }

        yield message as OutlookMessage;
      }

      url = res.data["@odata.nextLink"]?.replace(
        "https://graph.microsoft.com/v1.0",
        "",
      );
    }
  }

  /**
   * Fetch ALL Outlook emails from last N days (all folders)
   */
  public async fetchLastNDaysEmails(
    days = 30,
    options: {
      includeAttachments?: boolean;
      onMessage?: (msg: OutlookMessage) => Promise<void>;
    } = {},
  ): Promise<OutlookMessage[]> {
    const { includeAttachments = false, onMessage } = options;
    const results: OutlookMessage[] = [];

    for await (const message of this.iterateMessages(
      days,
      includeAttachments,
    )) {
      if (onMessage) {
        await onMessage(message);
      } else {
        results.push(message);
      }
    }

    return results;
  }

  public async listSubscriptions() {
    const client = await this.getClient();
    const res = await client.get("/subscriptions");
    return res.data.value;
  }

  public async deleteSubscription(subscriptionId: string) {
    const client = await this.getClient();
    await client.delete(`/subscriptions/${subscriptionId}`);
  }

  private async sendNewMail(input: SendEmailInput): Promise<string> {
    const client = await this.getClient();

    const res = await client.post("/me/sendMail", {
      message: {
        subject: input.subject,
        body: {
          contentType: "HTML",
          content: input.html,
        },
        toRecipients: input.to?.map((address) => ({
          emailAddress: { address },
        })),
        ccRecipients: input.cc?.map((address) => ({
          emailAddress: { address },
        })),
        bccRecipients: input.bcc?.map((address) => ({
          emailAddress: { address },
        })),
        attachments: input.attachments?.map((a) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: a.name,
          contentType: a.contentType,
          contentBytes: a.contentBase64,
        })),
      },
    });

    return res.status.toString();
  }

  private async replyToMessage(
    messageId: string,
    input: SendEmailInput,
  ): Promise<string> {
    const client = await this.getClient();

    console.log(`[Outlook] Creating reply draft for messageId: ${messageId}`);

    // 1. Create reply draft
    const draft = await client.post(`/me/messages/${messageId}/createReply`);

    const draftId = draft.data.id;
    console.log(`[Outlook] Reply draft created: ${draftId}`);

    // 2. Patch body / recipients / attachments
    const updatePayload: any = {
      body: {
        contentType: "HTML",
        content: input.html,
      },
    };

    if (input.cc?.length) {
      updatePayload.ccRecipients = input.cc.map((address) => ({
        emailAddress: { address },
      }));
      console.log(
        `[Outlook] Adding CC recipients: ${JSON.stringify(input.cc)}`,
      );
    }

    console.log(`[Outlook] Patching draft with payload...`);
    await client.patch(`/me/messages/${draftId}`, updatePayload);

    // 3. Add attachments separately if any
    if (input.attachments?.length) {
      console.log(
        `[Outlook] Adding ${input.attachments.length} attachments...`,
      );
      for (const attachment of input.attachments) {
        await client.post(`/me/messages/${draftId}/attachments`, {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: attachment.name,
          contentType: attachment.contentType,
          contentBytes: attachment.contentBase64,
        });
      }
    }

    // 4. Send
    console.log(`[Outlook] Sending draft: ${draftId}`);
    await client.post(`/me/messages/${draftId}/send`);
    console.log(`[Outlook] Send request completed`);

    return draftId;
  }

  private async replyAllToMessage(
    messageId: string,
    input: SendEmailInput,
  ): Promise<string> {
    const client = await this.getClient();

    const draft = await client.post(`/me/messages/${messageId}/createReplyAll`);

    const draftId = draft.data.id;

    const updatePayload: any = {
      body: {
        contentType: "HTML",
        content: input.html,
      },
    };

    if (input.cc?.length) {
      updatePayload.ccRecipients = input.cc.map((address) => ({
        emailAddress: { address },
      }));
    }

    await client.patch(`/me/messages/${draftId}`, updatePayload);

    // Add attachments separately if any
    if (input.attachments?.length) {
      for (const attachment of input.attachments) {
        await client.post(`/me/messages/${draftId}/attachments`, {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: attachment.name,
          contentType: attachment.contentType,
          contentBytes: attachment.contentBase64,
        });
      }
    }

    await client.post(`/me/messages/${draftId}/send`);

    return draftId;
  }

  private async forwardMessage(
    messageId: string,
    input: SendEmailInput,
  ): Promise<string> {
    const client = await this.getClient();

    // 1. Create forward draft (Outlook automatically includes original message)
    const draft = await client.post(`/me/messages/${messageId}/createForward`);
    const draftId = draft.data.id;

    // 2. Update draft with custom HTML and recipients
    const updatePayload: any = {
      body: {
        contentType: "HTML",
        content: input.html,
      },
      toRecipients: input.to?.map((address) => ({
        emailAddress: { address },
      })),
    };

    if (input.cc?.length) {
      updatePayload.ccRecipients = input.cc.map((address) => ({
        emailAddress: { address },
      }));
    }

    if (input.bcc?.length) {
      updatePayload.bccRecipients = input.bcc.map((address) => ({
        emailAddress: { address },
      }));
    }

    await client.patch(`/me/messages/${draftId}`, updatePayload);

    // 3. Add additional attachments separately if any
    if (input.attachments?.length) {
      for (const attachment of input.attachments) {
        await client.post(`/me/messages/${draftId}/attachments`, {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: attachment.name,
          contentType: attachment.contentType,
          contentBytes: attachment.contentBase64,
        });
      }
    }

    // 4. Send
    await client.post(`/me/messages/${draftId}/send`);

    return draftId;
  }

  public async sendEmail(input: SendEmailInput): Promise<string> {
    switch (input.mode) {
      case "new":
        return this.sendNewMail(input);

      case "reply":
        if (!input.replyToMessageId) {
          throw new Error("replyToMessageId required");
        }
        return this.replyToMessage(input.replyToMessageId, input);

      case "reply_all":
        if (!input.replyToMessageId) {
          throw new Error("replyToMessageId required");
        }
        return this.replyAllToMessage(input.replyToMessageId, input);

      case "forward":
        if (!input.replyToMessageId) {
          throw new Error("replyToMessageId required for forward");
        }
        return this.forwardMessage(input.replyToMessageId, input);

      default:
        throw new Error(`Unsupported mode: ${input.mode}`);
    }
  }

  private async patchMessage(
    messageId: string,
    body: Record<string, any>,
  ): Promise<void> {
    const client = await this.getClient();
    await client.patch(`/me/messages/${messageId}`, body);
  }

  private async moveMessage(
    messageId: string,
    destinationFolderId: string,
  ): Promise<void> {
    const client = await this.getClient();
    await client.post(`/me/messages/${messageId}/move`, {
      destinationId: destinationFolderId,
    });
  }

  async markRead(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await this.patchMessage(id, { isRead: true });
    }
  }

  async markUnread(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await this.patchMessage(id, { isRead: false });
    }
  }

  async star(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await this.patchMessage(id, {
        flag: { flagStatus: "flagged" },
      });
    }
  }

  async unstar(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      await this.patchMessage(id, {
        flag: { flagStatus: "notFlagged" },
      });
    }
  }
  private async getFolderId(displayName: string): Promise<string> {
    if (this.folderCache.has(displayName)) {
      return this.folderCache.get(displayName)!;
    }

    const client = await this.getClient();
    const res = await client.get("/me/mailFolders");

    const folder = res.data.value.find(
      (f: any) => f.displayName.toLowerCase() === displayName.toLowerCase(),
    );

    if (!folder) {
      throw new Error(`Folder not found: ${displayName}`);
    }

    this.folderCache.set(displayName, folder.id);
    return folder.id;
  }

  async archive(messageIds: string[]): Promise<void> {
    const archiveFolderId = await this.getFolderId("Archive");

    for (const id of messageIds) {
      await this.moveMessage(id, archiveFolderId);
    }
  }

  async unarchive(messageIds: string[]): Promise<void> {
    const inboxFolderId = await this.getFolderId("Inbox");

    for (const id of messageIds) {
      await this.moveMessage(id, inboxFolderId);
    }
  }

  async trash(messageIds: string[]): Promise<void> {
    const client = await this.getClient();

    for (const id of messageIds) {
      await client.delete(`/me/messages/${id}`);
    }
  }

  async restoreFromTrash(messageIds: string[]): Promise<void> {
    const inboxFolderId = await this.getFolderId("Inbox");

    for (const id of messageIds) {
      await this.moveMessage(id, inboxFolderId);
    }
  }

  async applyCategory(messageIds: string[], category: string): Promise<void> {
    for (const id of messageIds) {
      await this.patchMessage(id, {
        categories: [category],
      });
    }
  }

  async removeCategory(messageIds: string[], category: string): Promise<void> {
    for (const id of messageIds) {
      await this.patchMessage(id, {
        categories: [],
      });
    }
  }
}
