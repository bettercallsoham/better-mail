import axios, { AxiosInstance } from "axios";
import "dotenv/config";
import redis from "../../config/redis";
import { EmailAccount } from "../../models";
import { GmailMessage } from "./interfaces";

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

  private async *iterateMessageIds(days: number) {
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

    return {
      historyId: res.data.historyId,
      expiration: res.data.expiration,
    };
  }

  private async fetchMessage(messageId: string): Promise<GmailMessage> {
    const client = await this.getClient();

    const res = await client.get(`/users/me/messages/${messageId}`, {
      params: { format: "full" },
    });

    return res.data;
  }

  /**
   * Fetch ALL Gmail emails from last N days (all folders)
   */
  public async fetchLastNDaysEmails(
    days = 30,
    onMessage?: (msg: GmailMessage) => Promise<void>,
  ): Promise<GmailMessage[]> {
    const results: GmailMessage[] = [];

    for await (const messageId of this.iterateMessageIds(days)) {
      const message = await this.fetchMessage(messageId);

      if (onMessage) {
        await onMessage(message);
      } else {
        results.push(message);
      }
    }

    return results;
  }
}
