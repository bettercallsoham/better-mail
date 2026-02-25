import { logger } from "@sentry/node";
import redis from "../../shared/config/redis";
import { EmailAccount } from "../../shared/models";

const USER_EMAILS_CACHE_TTL = 3600; // 1 hour

/**
 * Get user's email addresses with Redis caching
 * @param userId - User ID
 * @param specificEmail - Optional specific email to verify ownership
 * @returns Array of email addresses (lowercase)
 */
export async function getUserEmails(
  userId: string,
  specificEmail?: string,
): Promise<{ emails: string[]; error?: string }> {
  const cacheKey = `user:${userId}:emails`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const emails: string[] = JSON.parse(cached);

      if (specificEmail) {
        const normalized = specificEmail.toLowerCase();
        if (!emails.includes(normalized)) {
          return {
            emails: [],
            error: "You don't have access to this email account",
          };
        }
        return { emails: [normalized] };
      }

      return { emails };
    }
  } catch (cacheError) {
    logger.warn("Redis cache error:" + cacheError);
  }

  const whereClause: any = { user_id: userId };
  if (specificEmail) {
    whereClause.email = specificEmail.toLowerCase();
  }

  const userAccounts = await EmailAccount.findAll({
    where: whereClause,
    attributes: ["email"],
  });

  if (userAccounts.length === 0) {
    if (specificEmail) {
      return {
        emails: [],
        error: "You don't have access to this email account",
      };
    }
    return { emails: [] };
  }

  const emails = userAccounts.map((acc) => acc.email.toLowerCase());

  if (!specificEmail) {
    redis
      .setex(cacheKey, USER_EMAILS_CACHE_TTL, JSON.stringify(emails))
      .catch((err) => {
        logger.warn("Failed to cache user emails:", err);
      });
  }

  if (specificEmail) {
    return { emails: [specificEmail.toLowerCase()] };
  }

  return { emails };
}


export async function invalidateUserEmailsCache(userId: string): Promise<void> {
  try {
    await redis.del(`user:${userId}:emails`);
  } catch (err) {
    logger.warn("Failed to invalidate email cache:"+ err);
  }
}


const EMAIL_USERS_CACHE_TTL = 3600; 

/**
 * Get all user IDs that own a specific email (with Redis caching)
 * @param email - Email address
 * @returns Array of user IDs
 */
export async function getUserIdsByEmail(
  email: string,
): Promise<string[]> {
  const normalized = email.toLowerCase();
  const cacheKey = `email:${normalized}:users`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    logger.warn("Redis cache error (email→users): " + cacheError);
  }

  const accounts = await EmailAccount.findAll({
    where: { email: normalized },
    attributes: ["user_id"],
  });

  if (!accounts.length) {
    return [];
  }

  const userIds = [
    ...new Set(accounts.map((acc) => acc.user_id)),
  ];

  redis
    .setex(cacheKey, EMAIL_USERS_CACHE_TTL, JSON.stringify(userIds))
    .catch((err) => {
      logger.warn("Failed to cache email→users:", err);
    });

  return userIds;
}

