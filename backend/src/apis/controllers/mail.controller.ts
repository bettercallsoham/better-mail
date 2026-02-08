import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { getUserEmails } from "../utils/email-helper";
import { EmailAccount } from "../../shared/models";

export const getConnectedMailboxes = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const EmailAccounts = await EmailAccount.findAll({
      where: {
        user_id: userId,
      },
      attributes: ["id", "email", "created_at"],
    });

    res.json({
      success: true,
      data: EmailAccounts,
    });
  },
  "getConnectedMailboxes",
);

export const getThreadEmails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { email, size, cursor } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Parse cursor if provided (it comes as a JSON string in query params)
    let parsedCursor: { receivedAt: string; id: string } | undefined;
    if (cursor && typeof cursor === "string") {
      try {
        parsedCursor = JSON.parse(cursor);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid cursor format",
        });
      }
    }

    // Get emails with caching
    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      email as string | undefined,
    );

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    if (emailAddresses.length === 0) {
      return res.json({
        success: true,
        data: { threads: [], nextCursor: null },
        message: "No connected email accounts",
      });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    const threads = await elasticService.getInboxThreads({
      emailAddresses,
      size: size ? parseInt(size as string, 10) : 20,
      cursor: parsedCursor,
    });

    res.json({
      success: true,
      data: threads,
    });
  },
  "getThreadEmails",
);

export const getEmailsByThreadId = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { threadId } = req.params;
    const { email } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get emails with caching
    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      email as string | undefined,
    );

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    if (emailAddresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No connected email accounts",
      });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    const emails = await elasticService.getEmailsByThreadId({
      threadId: Array.isArray(threadId) ? threadId[0] : threadId,
      emailAddresses,
    });

    res.json({
      success: true,
      data: emails,
    });
  },
  "getEmailsByThreadId",
);
