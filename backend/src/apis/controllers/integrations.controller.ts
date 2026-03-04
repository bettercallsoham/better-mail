import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import redis from "../../shared/config/redis";
import {
  Integration,
  IntegrationProvider,
  TelegramIntegration,
} from "../../shared/models";

export const getIntegrations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const integrations = await Integration.findAll({
      where: { user_id: userId },
      include: [{ model: TelegramIntegration, as: "telegram" }],
    });

    const byProvider = Object.fromEntries(
      integrations.map((i) => [i.provider, i]),
    );

    const tg = byProvider[IntegrationProvider.TELEGRAM];
    const telegram = tg
      ? {
          status: tg.status,
          connectedAt: tg.created_at,
          username: tg.telegram?.username ?? null,
          firstName: tg.telegram?.first_name ?? null,
          photoUrl: tg.telegram?.photo_url ?? null,
        }
      : null;

    res.json({
      success: true,
      data: {
        telegram,
        slack: null,
        notion: null,
        googleCalendar: null,
      },
    });
  },
  "getIntegrations",
);

export const disconnectTelegram = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const integration = await Integration.findOne({
      where: { user_id: userId, provider: IntegrationProvider.TELEGRAM },
      include: [{ model: TelegramIntegration, as: "telegram" }],
    });

    if (!integration) {
      return res
        .status(404)
        .json({ success: false, message: "Integration not found" });
    }

    const chatId = integration.telegram?.chat_id ?? null;

    // Delete child row first, then parent (FK constraint)
    await TelegramIntegration.destroy({
      where: { integration_id: integration.id },
    });
    await integration.destroy();

    // Invalidate all relevant cache keys
    const keysToDelete = [`tg:chat_id:${userId}`];
    if (chatId) keysToDelete.push(`tg:user_id_by_chat:${chatId}`);
    await redis.del(...keysToDelete);

    res.json({ success: true });
  },
  "disconnectTelegram",
);

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
