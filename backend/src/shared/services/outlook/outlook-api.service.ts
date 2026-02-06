import axios, { AxiosInstance } from "axios";
import "dotenv/config";
import redis from "../../config/redis";
import { EmailAccount } from "../../models";
import { OutlookMessage, OutlookAttachment } from "./interfaces";

export class OutlookApiService {
  private client?: AxiosInstance;
  private email: string;

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

    const res = await client.post(
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
}
