import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import redis from "../../shared/config/redis";

export const getTelegramLink = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    const token = crypto.randomUUID();

    const redisKey = `integration:telegram:link:${token}`; // Matches the Service
    await redis.set(redisKey, userId, "EX", 600);

    const deepLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`;

    res.json({ link: deepLink });
  },
  "getTelegramLink",
);
