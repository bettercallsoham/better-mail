import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import "dotenv/config";
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_CONNECT_REDIRECT_URI,
} = process.env;

if (
  !GOOGLE_CLIENT_ID ||
  !GOOGLE_CLIENT_SECRET ||
  !GOOGLE_REDIRECT_URI ||
  !GOOGLE_CONNECT_REDIRECT_URI
) {
  throw new Error("Google OAuth env vars are missing");
}

export type GoogleOAuthMode = "AUTH" | "EMAIL";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const GOOGLE_SCOPES = {
  AUTH: ["openid", "email", "profile"],
  EMAIL: [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
};

export class GoogleOAuthService {
  /**
   * Build Google OAuth consent URL
   */
  static buildAuthUrl(mode: GoogleOAuthMode) {
    const scopes = GOOGLE_SCOPES[mode].join(" ");
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      redirect_uri:
        mode === "AUTH" ? GOOGLE_REDIRECT_URI! : GOOGLE_CONNECT_REDIRECT_URI!,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for tokens
   */

  static async exchangeCode(code: string, mode: GoogleOAuthMode) {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri:
          mode === "AUTH" ? GOOGLE_REDIRECT_URI! : GOOGLE_CONNECT_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return response.data as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      id_token: string;
      token_type: string;
    };
  }

  /**
   * Verify Google ID token and extract identity
   */
  static async verifyIdToken(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Invalid Google ID token");
    }

    if (!payload.email_verified) {
      throw new Error("Google email not verified");
    }

    return {
      googleId: payload.sub,
      email: payload.email!,
      fullName: payload.name || "",
      avatar: payload.picture || "",
    };
  }
}
