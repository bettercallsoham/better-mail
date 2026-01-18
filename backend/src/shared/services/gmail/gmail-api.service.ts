import axios, { AxiosInstance } from "axios";
import "dotenv/config";
import redis from "../../config/redis";
import { EmailAccount } from "../../models";

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailBody {
  size: number;
  data?: string;
  attachmentId?: string;
}

export interface GmailPayload {
  partId: string;
  mimeType: string;
  filename: string;

  headers: GmailHeader[];

  body: GmailBody;

  parts?: GmailPayload[];
}

export interface GmailMessage {
  id: string;
  threadId: string;

  labelIds: string[];

  snippet: string;

  sizeEstimate: number;

  historyId: string;

  internalDate: string;

  payload: GmailPayload;
}

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
