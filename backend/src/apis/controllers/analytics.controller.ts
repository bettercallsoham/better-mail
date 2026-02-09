import { Request, Response } from "express";
import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getUserEmails } from "../utils/email-helper";
import redis from "../../shared/config/redis";

export const getAnalyticsOverview = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { period = "weekly", email } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    try {
      const { emails: emailAddresses, error } = await getUserEmails(
        userId,
        email as string | undefined,
      );

      if (error || emailAddresses.length === 0) {
        return res.status(403).json({
          success: false,
          message: error || "No connected email accounts",
        });
      }

      // Check cache
      const cacheKey = `analytics:${userId}:overview:${period}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      const elasticService = new ElasticsearchService(elasticClient);
      const overview = await elasticService.getAnalyticsOverview(
        emailAddresses,
        period as "daily" | "weekly" | "monthly",
      );

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(overview));

      res.json({
        success: true,
        data: overview,
        cached: false,
      });
    } catch (error: any) {
      console.error("Failed to get analytics overview:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get analytics overview",
      });
    }
  },
  "getAnalyticsOverview",
);

export const getTimePatterns = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { period = "weekly", email } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    try {
      const { emails: emailAddresses, error } = await getUserEmails(
        userId,
        email as string | undefined,
      );

      if (error || emailAddresses.length === 0) {
        return res.status(403).json({
          success: false,
          message: error || "No connected email accounts",
        });
      }

      // Check cache
      const cacheKey = `analytics:${userId}:time-patterns:${period}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      const elasticService = new ElasticsearchService(elasticClient);
      const patterns = await elasticService.getTimePatterns(
        emailAddresses,
        period as "weekly" | "monthly",
      );

      // Cache for 6 hours
      await redis.setex(cacheKey, 21600, JSON.stringify(patterns));

      res.json({
        success: true,
        data: patterns,
        cached: false,
      });
    } catch (error: any) {
      console.error("Failed to get time patterns:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get time patterns",
      });
    }
  },
  "getTimePatterns",
);
