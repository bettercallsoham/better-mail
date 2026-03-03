import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
const { JWT_SECRET } = process.env;
import bcrypt from "bcrypt";
import axios from "axios";
import { Request, Response } from "express";
import { EmailAccount, User } from "../../shared/models";
import { GoogleOAuthService } from "../services/oauth/google-oauth.service";
import { OutlookOAuthService } from "../services/oauth/outlook-oauth.service";
import redis from "../../shared/config/redis";
import { handleMailboxConnectionQueue } from "../../shared/queues/handle-mailbox-connection";
import { invalidateUserEmailsCache } from "../utils/email-helper";

/**
 * Fetch the Outlook profile photo from Microsoft Graph and return it
 * as a base64 data URL. Returns null if unavailable.
 */
async function fetchOutlookAvatar(accessToken: string): Promise<string | null> {
  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me/photo/$value",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: "arraybuffer",
        timeout: 5000,
      },
    );
    const contentType = response.headers["content-type"] ?? "image/jpeg";
    const base64 = Buffer.from(response.data).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}
export const connectGmail = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exist",
      });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exist",
      });
    }

    const { url, state } = GoogleOAuthService.buildAuthUrl("EMAIL");

    await redis.set(
      `google:oauth:${state}`,
      JSON.stringify({ userId }),
      "EX",
      300,
    );

    return res.status(200).json({ url });
  },
  "connectGmail",
);

export const connectOutlook = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { url, state, codeVerifier } =
    OutlookOAuthService.buildAuthUrl("EMAIL");

  await redis.set(
    `outlook:oauth:${state}`,
    JSON.stringify({
      userId,
      mode: "EMAIL",
      codeVerifier,
    }),
    "EX",
    300,
  );
  return res.status(200).json({ url });
}, "connectOutlook");

export const gmailConnectCallback = asyncHandler(async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      message: "Missing code or state",
    });
  }

  const raw = await redis.get(`google:oauth:${state}`);
  if (!raw) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OAuth state",
    });
  }

  // one-time use
  await redis.del(`google:oauth:${state}`);

  const { userId } = JSON.parse(raw);

  const tokens = await GoogleOAuthService.exchangeCode(code, "EMAIL");

  if (!tokens.id_token) {
    throw new Error("Missing id_token from Google");
  }

  const identity = await GoogleOAuthService.verifyIdToken(tokens.id_token);

  if (tokens.refresh_token) {
    await EmailAccount.upsert({
      user_id: userId,
      provider: "GOOGLE",
      email: identity.email,
      refresh_token: tokens.refresh_token,
      avatar_url: identity.avatar || null,
    });
  } else {
    await EmailAccount.upsert({
      user_id: userId,
      provider: "GOOGLE",
      email: identity.email,
      avatar_url: identity.avatar || null,
    });
  }

  await handleMailboxConnectionQueue.add(handleMailboxConnectionQueue.name, {
    provider: "google",
    email: identity.email,
  });

  await invalidateUserEmailsCache(userId);

  return res.redirect(
    `${process.env.FRONTEND_URL}/app/settings?provider=gmail&email=${encodeURIComponent(identity.email)}`,
  );
}, "gmailConnectCallback");

export const outlookConnectCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: "Missing code or state",
      });
    }

    const raw = await redis.get(`outlook:oauth:${state}`);
    if (!raw) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OAuth state",
      });
    }

    // one-time use
    await redis.del(`outlook:oauth:${state}`);

    const { userId, codeVerifier, mode } = JSON.parse(raw);

    if (!codeVerifier) {
      throw new Error("Missing PKCE code_verifier");
    }

    /**
     * Exchange code → tokens
     */
    const tokens = await OutlookOAuthService.exchangeCode(
      code,
      mode,
      codeVerifier,
    );

    if (!tokens.id_token) {
      throw new Error("Missing id_token from Outlook");
    }

    /**
     * Parse identity from ID token
     */
    const identity = OutlookOAuthService.parseIdToken(tokens.id_token);

    if (!identity.email) {
      throw new Error("Unable to resolve Outlook email");
    }

    /**
     * Fetch profile photo from Graph API (best-effort)
     */
    const avatarUrl = await fetchOutlookAvatar(tokens.access_token);

    /**
     * Persist email account
     */
    await EmailAccount.upsert({
      user_id: userId,
      provider: "OUTLOOK",
      email: identity.email,
      refresh_token: tokens.refresh_token ?? null,
      avatar_url: avatarUrl,
    });

    await handleMailboxConnectionQueue.add(handleMailboxConnectionQueue.name, {
      provider: "outlook",
      email: identity.email,
    });

    await invalidateUserEmailsCache(userId);

    return res.redirect(
      `${process.env.FRONTEND_URL}/app/settings?provider=gmail&email=${encodeURIComponent(identity.email)}`,
    );
  },
  "outlookConnectCallback",
);
