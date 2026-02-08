import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { UnifiedEmailDocument } from "../../shared/services/elastic/interface";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { getUserEmails } from "../utils/email-helper";
import { EmailAccount } from "../../shared/models";
import { OutlookApiService } from "../../shared/services/outlook/outlook-api.service";
import { GmailApiService } from "../../shared/services/gmail/gmail-api.service";

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

export const getFolders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
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
    return res.json({
      success: true,
      data: {
        system: {
          unread: 0,
          starred: 0,
          archived: 0,
          inbox: 0,
          sent: 0,
          important: 0,
        },
        labels: [],
      },
      message: "No connected email accounts",
    });
  }

  const elasticService = new ElasticsearchService(elasticClient);

  const folderCounts = await elasticService.getFolderCounts(emailAddresses);

  res.json({
    success: true,
    data: folderCounts,
  });
}, "getFolders");

export const replyEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const {
    from,
    provider,
    replyToMessageId,
    html,
    mode = "reply",
    to,
    cc,
    bcc,
    subject,
    attachments,
  } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  // Verify user owns the from email (uses cache)
  const { emails: emailAddresses, error } = await getUserEmails(userId, from);

  if (error || emailAddresses.length === 0) {
    return res.status(403).json({
      success: false,
      message: error || "You don't have access to this email account",
    });
  }

  try {
    let messageId: string;

    if (provider === "GOOGLE") {
      const gmailService = new GmailApiService({ email: from });

      messageId = await gmailService.sendEmail({
        mode,
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        replyToMessageId,
        attachments,
      });
    } else if (provider === "OUTLOOK") {
      const outlookService = new OutlookApiService({ email: from });

      messageId = await outlookService.sendEmail({
        mode,
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        replyToMessageId,
        attachments,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported email provider",
      });
    }

    res.json({
      success: true,
      data: { messageId },
      message: "Email sent successfully",
    });
  } catch (error: any) {
    console.error("Failed to send reply:", error);

    // Handle specific error cases
    if (error.response?.status === 401 || error.message?.includes("token")) {
      return res.status(401).json({
        success: false,
        message: "Email authentication expired. Please reconnect your account.",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please try again later.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send email",
    });
  }
}, "replyEmail");

export const sendEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, provider, to, subject, html, cc, bcc, attachments } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  // Verify user owns the from email (uses cache)
  const { emails: emailAddresses, error } = await getUserEmails(userId, from);

  if (error || emailAddresses.length === 0) {
    return res.status(403).json({
      success: false,
      message: error || "You don't have access to this email account",
    });
  }

  try {
    let messageId: string;

    if (provider === "GOOGLE") {
      const gmailService = new GmailApiService({ email: from });

      messageId = await gmailService.sendEmail({
        mode: "new",
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        attachments,
      });
    } else if (provider === "OUTLOOK") {
      const outlookService = new OutlookApiService({ email: from });

      messageId = await outlookService.sendEmail({
        mode: "new",
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        attachments,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported email provider",
      });
    }

    res.json({
      success: true,
      data: { messageId },
      message: "Email sent successfully",
    });
  } catch (error: any) {
    console.error("Failed to send email:", error);

    // Handle specific error cases
    if (error.response?.status === 401 || error.message?.includes("token")) {
      return res.status(401).json({
        success: false,
        message: "Email authentication expired. Please reconnect your account.",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please try again later.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send email",
    });
  }
}, "sendEmail");

export const emailAction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, provider, messageIds, action } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  // Verify user owns the email (uses cache)
  const { emails: emailAddresses, error } = await getUserEmails(userId, from);

  if (error || emailAddresses.length === 0) {
    return res.status(403).json({
      success: false,
      message: error || "You don't have access to this email account",
    });
  }

  try {
    // Execute action on provider API
    if (provider === "GOOGLE") {
      const gmailService = new GmailApiService({ email: from });

      switch (action) {
        case "mark_read":
          await gmailService.markRead(messageIds);
          break;
        case "mark_unread":
          await gmailService.markUnread(messageIds);
          break;
        case "star":
          await gmailService.star(messageIds);
          break;
        case "unstar":
          await gmailService.unstar(messageIds);
          break;
        case "archive":
          await gmailService.archive(messageIds);
          break;
        case "unarchive":
          await gmailService.unarchive(messageIds);
          break;
        case "delete":
          await gmailService.trash(messageIds);
          break;
      }
    } else if (provider === "OUTLOOK") {
      const outlookService = new OutlookApiService({ email: from });

      switch (action) {
        case "mark_read":
          await outlookService.markRead(messageIds);
          break;
        case "mark_unread":
          await outlookService.markUnread(messageIds);
          break;
        case "star":
          await outlookService.star(messageIds);
          break;
        case "unstar":
          await outlookService.unstar(messageIds);
          break;
        case "archive":
          await outlookService.archive(messageIds);
          break;
        case "delete":
          await outlookService.trash(messageIds);
          break;
        case "unarchive":
          await outlookService.unarchive(messageIds);
          break;
      }
    }

    // Update Elasticsearch with action results
    const elasticService = new ElasticsearchService(elasticClient);
    const updates = getElasticUpdates(action);

    if (updates) {
      const esProvider = provider === "GOOGLE" ? "gmail" : "outlook";
      await elasticService.bulkUpdateEmails({
        provider: esProvider,
        providerMessageIds: messageIds,
        updates,
      });
    }

    res.json({
      success: true,
      action,
      updated: messageIds.length,
      messageIds,
    });
  } catch (error: any) {
    console.error("Failed to perform email action:", error);

    // Handle specific error cases
    if (error.response?.status === 401 || error.message?.includes("token")) {
      return res.status(401).json({
        success: false,
        message: "Email authentication expired. Please reconnect your account.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to perform action",
    });
  }
}, "emailAction");

/**
 * Helper: Map action to Elasticsearch field updates
 */
function getElasticUpdates(
  action: string,
): Partial<UnifiedEmailDocument> | null {
  switch (action) {
    case "mark_read":
      return { isRead: true };
    case "mark_unread":
      return { isRead: false };
    case "star":
      return { isStarred: true };
    case "unstar":
      return { isStarred: false };
    case "archive":
      return { isArchived: true };
    case "unarchive":
      return { isArchived: false };
    case "delete":
      return { isDeleted: true };
    default:
      return null;
  }
}
