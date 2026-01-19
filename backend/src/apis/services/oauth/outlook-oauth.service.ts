import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const {
  OUTLOOK_CLIENT_ID,
  OUTLOOK_CLIENT_SECRET,
  OUTLOOK_REDIRECT_URI,
  OUTLOOK_CONNECT_REDIRECT_URI,
} = process.env;

if (
  !OUTLOOK_CLIENT_ID ||
  !OUTLOOK_CLIENT_SECRET ||
  !OUTLOOK_REDIRECT_URI ||
  !OUTLOOK_CONNECT_REDIRECT_URI
) {
  throw new Error("Outlook OAuth env vars are missing");
}

export type OutlookOAuthMode = "AUTH" | "EMAIL";

const OUTLOOK_SCOPES: Record<OutlookOAuthMode, string[]> = {
  AUTH: ["openid", "profile", "email", "User.Read"],
  EMAIL: [
    "openid",
    "profile",
    "email",
    "User.Read",
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "offline_access",
  ],
};

const AUTHORIZE_URL =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
const TOKEN_URL =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";

/**
 * PKCE helpers
 */
function base64URLEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

export class OutlookOAuthService {
  /**
   * Build OAuth authorization URL
   */
  static buildAuthUrl(mode: OutlookOAuthMode) {
    const scope = OUTLOOK_SCOPES[mode].join(" ");
    const state = crypto.randomUUID();

    // PKCE
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));

    const redirectUri =
      mode === "AUTH" ? OUTLOOK_REDIRECT_URI! : OUTLOOK_CONNECT_REDIRECT_URI!;

    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID!,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope,
      prompt: "consent",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      url: `${AUTHORIZE_URL}?${params.toString()}`,
      state,
      codeVerifier, // store server-side
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCode(
    code: string,
    mode: OutlookOAuthMode,
    codeVerifier: string,
  ) {
    const redirectUri =
      mode === "AUTH" ? OUTLOOK_REDIRECT_URI! : OUTLOOK_CONNECT_REDIRECT_URI!;

    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: OUTLOOK_CLIENT_ID!,
        client_secret: OUTLOOK_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
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
   * Refresh access token
   */
  static async refreshToken(refreshToken: string) {
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: OUTLOOK_CLIENT_ID!,
        client_secret: OUTLOOK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
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
   * Parse ID token (AUTH flow)
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
