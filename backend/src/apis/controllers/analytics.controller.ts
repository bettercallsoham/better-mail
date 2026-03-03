import { Request, Response } from "express";
import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { AnalyticsService } from "../services/analytics.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getUserEmails } from "../utils/email-helper";
import redis from "../../shared/config/redis";
import { logger } from "@sentry/node";

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
      logger.error("Failed to get analytics overview:", error);

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
      logger.error("Failed to get time patterns:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get time patterns",
      });
    }
  },
  "getTimePatterns",
);

export const getSenderAnalytics = asyncHandler(
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

      const emailScope = (email as string | undefined) ?? "all";
      const cacheKey = `analytics:${userId}:senders:v4:${period}:${emailScope}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      const analyticsService = new AnalyticsService(elasticClient);
      const data = await analyticsService.getSenderAnalytics(
        emailAddresses,
        period as "daily" | "weekly" | "monthly",
      );

      // Cache for 6 hours — sender patterns are slow-changing
      await redis.setex(cacheKey, 21600, JSON.stringify(data));

      res.json({
        success: true,
        data,
        cached: false,
      });
    } catch (error: any) {
      logger.error("Failed to get sender analytics:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get sender analytics",
      });
    }
  },
  "getSenderAnalytics",
);

export const getInboxHealth = asyncHandler(
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

      const emailScope = (email as string | undefined) ?? "all";
      const cacheKey = `analytics:${userId}:inbox-health:v2:${period}:${emailScope}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      const analyticsService = new AnalyticsService(elasticClient);
      const data = await analyticsService.getInboxHealth(
        emailAddresses,
        period as "daily" | "weekly" | "monthly",
      );

      // Cache for 1 hour — inbox state changes frequently
      await redis.setex(cacheKey, 3600, JSON.stringify(data));

      res.json({
        success: true,
        data,
        cached: false,
      });
    } catch (error: any) {
      logger.error("Failed to get inbox health:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get inbox health",
      });
    }
  },
  "getInboxHealth",
);

export const getResponseAnalytics = asyncHandler(
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

      const emailScope = (email as string | undefined) ?? "all";
      const cacheKey = `analytics:${userId}:response:v3:${period}:${emailScope}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      const analyticsService = new AnalyticsService(elasticClient);
      const data = await analyticsService.getResponseAnalytics(
        emailAddresses,
        period as "weekly" | "monthly",
      );

      // Cache for 3 hours
      await redis.setex(cacheKey, 10800, JSON.stringify(data));

      res.json({
        success: true,
        data,
        cached: false,
      });
    } catch (error: any) {
      logger.error("Failed to get response analytics:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get response analytics",
      });
    }
  },
  "getResponseAnalytics",
);
