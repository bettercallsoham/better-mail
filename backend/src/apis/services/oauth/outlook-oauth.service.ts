import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const { OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_REDIRECT_URI } =
  process.env;

if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET || !OUTLOOK_REDIRECT_URI) {
  throw new Error("Outlook OAuth env vars are missing");
}

export type OutlookOAuthMode = "AUTH" | "EMAIL";

/**
 * Scopes
 * AUTH  -> identity only
 * EMAIL -> mailbox access
 */
const OUTLOOK_SCOPES: Record<OutlookOAuthMode, string[]> = {
  AUTH: ["openid", "profile", "email", "User.Read"],
  EMAIL: ["offline_access", "Mail.Read", "Mail.Send", "User.Read"],
};

const AUTHORIZE_URL =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
const TOKEN_URL =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";

export class OutlookOAuthService {
  /**
   * Build OAuth authorization URL
   */
  static buildAuthUrl(mode: OutlookOAuthMode) {
    const scope = OUTLOOK_SCOPES[mode].join(" ");

    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID!,
      response_type: "code",
      redirect_uri: OUTLOOK_REDIRECT_URI!,
      response_mode: "query",
      scope,
      prompt: "consent",
      state,
    });

    return {
      url: `${AUTHORIZE_URL}?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCode(code: string) {
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: OUTLOOK_CLIENT_ID!,
        client_secret: OUTLOOK_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: OUTLOOK_REDIRECT_URI!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.data as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      id_token?: string;
      token_type: "Bearer";
    };
  }

  /**
   * Refresh access token using refresh token
   * NOTE: refresh tokens are opaque, do NOT decode
   */
  static async refreshToken(refreshToken: string) {
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: OUTLOOK_CLIENT_ID!,
        client_secret: OUTLOOK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        redirect_uri: OUTLOOK_REDIRECT_URI!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.data as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: "Bearer";
    };
  }

  /**
   * Parse ID token (AUTH flow only)
   */
  static parseIdToken(idToken: string) {
    const decoded = jwt.decode(idToken) as any;

    if (!decoded?.sub) {
      throw new Error("Invalid Outlook ID token");
    }

    return {
      outlookId: decoded.sub,
      email: decoded.email || decoded.preferred_username,
      fullName: decoded.name ?? "",
      issuer: decoded.iss,
    };
  }
}
