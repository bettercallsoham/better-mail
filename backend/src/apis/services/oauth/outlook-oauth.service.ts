import axios from "axios";
import jwt from "jsonwebtoken";

const { OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_REDIRECT_URI } =
  process.env;

if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET || !OUTLOOK_REDIRECT_URI) {
  throw new Error("Outlook OAuth env vars are missing");
}

export type OutlookOAuthMode = "AUTH" | "EMAIL";

const OUTLOOK_SCOPES: Record<OutlookOAuthMode, string[]> = {
  AUTH: ["openid", "profile", "email", "offline_access", "User.Read"],
  EMAIL: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Mail.Read",
    "Mail.Send",
  ],
};

const AUTHORIZE_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export class OutlookOAuthService {
  /**
   * Build Outlook OAuth authorization URL
   */
  static buildAuthUrl(mode: OutlookOAuthMode) {
    const scope = OUTLOOK_SCOPES[mode].join(" ");

    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID!,
      response_type: "code",
      redirect_uri: OUTLOOK_REDIRECT_URI!,
      response_mode: "query",
      scope,
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

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
      id_token: string;
      token_type: "Bearer";
    };
  }

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

  static parseIdToken(idToken: string) {
    const decoded = jwt.decode(idToken) as any;

    if (!decoded?.sub) {
      throw new Error("Invalid Outlook ID token");
    }

    return {
      outlookId: decoded.sub,
      email: decoded.email || decoded.preferred_username,
      fullName: decoded.name ?? "",
      tenantId: decoded.tid,
    };
  }
}
