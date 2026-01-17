import axios from "axios";
import redis from "../../config/redis";
import "dotenv/config";

const tenantId = process.env.MICROSOFT_TENANT_ID;
if (!tenantId) {
  throw new Error("Tenant Id is missing");
}
const TOKEN_URL = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
export async function refreshOutlookAccessToken({
  emailAccountId,
  refreshToken,
}: {
  emailAccountId: string;
  refreshToken: string;
}) {
  // const cacheKey = `outlook:access_token:${emailAccountId}`;

  // const cachedToken = await redis.get(cacheKey);
  // if (cachedToken) {
  //   return {
  //     access_token: cachedToken,
  //     refresh_token: refreshToken,
  //     source: "cache",
  //   };
  // }

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const { access_token, refresh_token, expires_in } = response.data;

  // await redis.setex(cacheKey, Math.max(expires_in - 60, 60), access_token);

  return {
    access_token,
    refresh_token: refresh_token ?? refreshToken,
    expires_in,
    source: "oauth",
  };
}
