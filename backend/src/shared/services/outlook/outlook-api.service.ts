import axios, { AxiosInstance } from "axios";
import "dotenv/config";
import redis from "../../config/redis";
import { EmailAccount } from "../../models";

export interface OutlookMessage {
  id: string;
  conversationId: string;

  receivedDateTime: string;
  sentDateTime: string;

  subject: string;
  bodyPreview: string;

  from?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };

  toRecipients: {
    emailAddress: {
      name: string;
      address: string;
    };
  }[];

  ccRecipients?: {
    emailAddress: {
      name: string;
      address: string;
    };
  }[];

  body: {
    contentType: "text" | "html";
    content: string;
  };

  hasAttachments: boolean;
  internetMessageHeaders?: {
    name: string;
    value: string;
  }[];
}

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

  /* ===================== CORE ITERATOR ===================== */

  private async *iterateMessages(days: number) {
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
    onMessage?: (msg: OutlookMessage) => Promise<void>,
  ): Promise<OutlookMessage[]> {
    const results: OutlookMessage[] = [];

    for await (const message of this.iterateMessages(days)) {
      if (onMessage) {
        await onMessage(message);
      } else {
        results.push(message);
      }
    }

    return results;
  }
}

