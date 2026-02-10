import { elasticClient } from "../../shared/config/elastic";
import { ElasticsearchService } from "../../shared/services/elastic/elastic.service";
import { UnifiedEmailDocument } from "../../shared/services/elastic/interface";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { getUserEmails } from "../utils/email-helper";
import { EmailAccount } from "../../shared/models";
import { OutlookApiService } from "../../shared/services/outlook/outlook-api.service";
import { GmailApiService } from "../../shared/services/gmail/gmail-api.service";
import { searchHistoryQueue } from "../../shared/queues";

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

export const searchEmails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
      query,
      from: fromEmail,
      size,
      cursor,
      isRead,
      isStarred,
      isArchived,
      hasAttachments,
      filterFrom,
      filterTo,
      labels,
      dateFrom,
      dateTo,
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get user's emails (uses cache)
    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      fromEmail as string | undefined,
    );

    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts found",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);

      // Parse cursor if provided
      let parsedCursor;
      if (cursor && typeof cursor === "string") {
        try {
          parsedCursor = JSON.parse(cursor);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid cursor format",
          });
        }
      }

      // Parse labels if provided
      let parsedLabels;
      if (labels && typeof labels === "string") {
        try {
          parsedLabels = JSON.parse(labels);
        } catch (e) {
          parsedLabels = [labels];
        }
      }

      // Track search execution time
      const startTime = Date.now();

      const result = await elasticService.searchEmails({
        emailAddresses,
        query: query as string,
        size: size ? parseInt(size as string) : 20,
        cursor: parsedCursor,
        filters: {
          isRead: isRead !== undefined ? isRead === "true" : undefined,
          isStarred: isStarred !== undefined ? isStarred === "true" : undefined,
          isArchived:
            isArchived !== undefined ? isArchived === "true" : undefined,
          hasAttachments:
            hasAttachments !== undefined
              ? hasAttachments === "true"
              : undefined,
          from: filterFrom as string | undefined,
          to: filterTo as string | undefined,
          labels: parsedLabels,
          dateFrom: dateFrom as string | undefined,
          dateTo: dateTo as string | undefined,
        },
      });

      const executionTimeMs = Date.now() - startTime;

      // Add to queue for async storage (truly non-blocking)
      searchHistoryQueue
        .add("store-search", {
          userId,
          searchText: query as string,
          filters: {
            isRead: isRead !== undefined ? isRead === "true" : undefined,
            isStarred:
              isStarred !== undefined ? isStarred === "true" : undefined,
            isArchived:
              isArchived !== undefined ? isArchived === "true" : undefined,
            hasAttachments:
              hasAttachments !== undefined
                ? hasAttachments === "true"
                : undefined,
            from: filterFrom as string | undefined,
            to: filterTo as string | undefined,
            labels: parsedLabels,
            dateFrom: dateFrom as string | undefined,
            dateTo: dateTo as string | undefined,
          },
          resultsCount: result.total,
          executionTimeMs,
          emailAddresses,
        })
        .catch((err) => console.error("Failed to queue search history:", err));

      res.json({
        success: true,
        query,
        total: result.total,
        emails: result.emails,
        nextCursor: result.nextCursor,
      });
    } catch (error: any) {
      console.error("Search failed:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Search failed",
      });
    }
  },
  "searchEmails",
);

export const getInboxZero = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { from: fromEmail, size, cursor } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get user's emails (uses cache)
    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      fromEmail as string | undefined,
    );

    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts found",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);

      // Parse cursor if provided
      let parsedCursor;
      if (cursor && typeof cursor === "string") {
        try {
          parsedCursor = JSON.parse(cursor);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid cursor format",
          });
        }
      }

      const result = await elasticService.getInboxZeroEmails({
        emailAddresses,
        size: size ? parseInt(size as string) : 20,
        cursor: parsedCursor,
      });

      res.json({
        success: true,
        total: result.total,
        emails: result.emails,
        nextCursor: result.nextCursor,
      });
    } catch (error: any) {
      console.error("Failed to fetch inbox zero emails:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inbox zero emails",
      });
    }
  },
  "getInboxZero",
);

export const updateInboxState = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { email, provider, messageIds, action, snoozeUntil } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Verify user owns the email (uses cache)
    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      email,
    );

    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "You don't have access to this email account",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const esProvider = provider === "GOOGLE" ? "gmail" : "outlook";

      const result = await elasticService.updateInboxState({
        provider: esProvider,
        providerMessageIds: messageIds,
        inboxState: action,
        snoozeUntil,
      });

      res.json({
        success: true,
        action,
        updated: result.updated,
        errors: result.errors,
        messageIds,
      });
    } catch (error: any) {
      console.error("Failed to update inbox state:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to update inbox state",
      });
    }
  },
  "updateInboxState",
);

export const createSavedSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { name, description, query, isPinned, color } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const id = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const doc = {
        id,
        userId,
        name,
        description,
        query,
        usageCount: 0,
        isPinned: isPinned || false,
        color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await elasticService.createSavedSearch(doc);

      res.status(201).json({
        success: true,
        data: doc,
      });
    } catch (error: any) {
      console.error("Failed to create saved search:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create saved search",
      });
    }
  },
  "createSavedSearch",
);

export const getSavedSearches = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const searches = await elasticService.getSavedSearchesByUser(userId);

      res.json({
        success: true,
        data: searches,
      });
    } catch (error: any) {
      console.error("Failed to get saved searches:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get saved searches",
      });
    }
  },
  "getSavedSearches",
);

export const updateSavedSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid search ID",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const success = await elasticService.updateSavedSearch(
        id,
        userId,
        updates,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Saved search not found or access denied",
        });
      }

      res.json({
        success: true,
        message: "Saved search updated",
      });
    } catch (error: any) {
      console.error("Failed to update saved search:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to update saved search",
      });
    }
  },
  "updateSavedSearch",
);

export const deleteSavedSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid search ID",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const success = await elasticService.deleteSavedSearch(id, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Saved search not found or access denied",
        });
      }

      res.json({
        success: true,
        message: "Saved search deleted",
      });
    } catch (error: any) {
      console.error("Failed to delete saved search:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete saved search",
      });
    }
  },
  "deleteSavedSearch",
);

export const executeSavedSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { size, cursor } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid search ID",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);

      // Get saved search
      const savedSearch = await elasticService.getSavedSearchById(id, userId);

      if (!savedSearch) {
        return res.status(404).json({
          success: false,
          message: "Saved search not found or access denied",
        });
      }

      // Increment usage
      await elasticService.incrementSearchUsage(id);

      // Parse cursor
      let parsedCursor;
      if (cursor && typeof cursor === "string") {
        try {
          parsedCursor = JSON.parse(cursor);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid cursor format",
          });
        }
      }

      // Get email addresses (use saved or user's all accounts)
      let emailAddresses = savedSearch.query.emailAddresses;
      if (!emailAddresses || emailAddresses.length === 0) {
        const { emails, error } = await getUserEmails(userId);
        if (error || emails.length === 0) {
          return res.status(403).json({
            success: false,
            message: error || "No connected email accounts found",
          });
        }
        emailAddresses = emails;
      }

      // Execute search
      const result = await elasticService.searchEmails({
        emailAddresses,
        query: savedSearch.query.searchText,
        size: size ? parseInt(size as string) : 20,
        cursor: parsedCursor,
        filters: savedSearch.query.filters,
      });

      res.json({
        success: true,
        savedSearch: {
          id: savedSearch.id,
          name: savedSearch.name,
        },
        total: result.total,
        emails: result.emails,
        nextCursor: result.nextCursor,
      });
    } catch (error: any) {
      console.error("Failed to execute saved search:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to execute saved search",
      });
    }
  },
  "executeSavedSearch",
);

export const getRecentSearches = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { limit } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const searches = await elasticService.getRecentSearches(
        userId,
        limit ? parseInt(limit as string) : 10,
      );

      res.json({
        success: true,
        data: searches,
      });
    } catch (error: any) {
      console.error("Failed to get recent searches:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get recent searches",
      });
    }
  },
  "getRecentSearches",
);

// --------------------
// DRAFT CONTROLLERS
// --------------------

export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, provider, to, cc, bcc, subject, html, text, threadId } =
    req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    // Verify ownership
    const { emails: emailAddresses, error: emailError } =
      await getUserEmails(userId);
    if (emailError || !emailAddresses.includes(from.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this email account",
      });
    }

    const providerKey = provider === "GOOGLE" ? "gmail" : "outlook";
    let providerDraftId: string;

    if (providerKey === "gmail") {
      const gmailService = new GmailApiService({ email: from });
      providerDraftId = await gmailService.createDraft({
        mode: "new",
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        text,
      });
    } else {
      const outlookService = new OutlookApiService({ email: from });
      providerDraftId = await outlookService.createDraft({
        mode: "new",
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        text,
      });
    }

    // Index draft in Elasticsearch
    const elasticService = new ElasticsearchService(elasticClient);
    const draftDoc: UnifiedEmailDocument = {
      id: `${providerKey}_${providerDraftId}`,
      emailAddress: from.toLowerCase(),
      provider: providerKey,
      providerMessageId: providerDraftId,
      providerThreadId: threadId || "",
      threadId: threadId || `draft_${Date.now()}`,
      isThreadRoot: !threadId,
      receivedAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      indexedAt: new Date().toISOString(),
      from: { email: from.toLowerCase() },
      to: to.map((email: string) => ({ email: email.toLowerCase() })),
      cc: cc ? cc.map((email: string) => ({ email: email.toLowerCase() })) : [],
      bcc: bcc
        ? bcc.map((email: string) => ({ email: email.toLowerCase() }))
        : [],
      subject,
      bodyText: text,
      bodyHtml: html,
      snippet: text?.substring(0, 200) || html?.substring(0, 200) || "",
      hasAttachments: false,
      attachments: [],
      isRead: true,
      isStarred: false,
      isArchived: false,
      isDeleted: false,
      labels: ["DRAFT"],
      providerLabels: ["DRAFT"],
      isDraft: true,
      draftData: {
        providerDraftId,
        lastEditedAt: new Date().toISOString(),
      },
      inboxState: "DRAFT",
      searchText: `${subject} ${text || html || ""}`,
    };

    await elasticService.saveDraft(draftDoc);

    res.json({
      success: true,
      data: {
        id: draftDoc.id,
        providerDraftId,
      },
    });
  } catch (error: any) {
    console.error("Failed to create draft:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create draft",
    });
  }
}, "createDraft");

export const sendDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id as string;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { emails: emailAddresses, error } = await getUserEmails(userId);
    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts",
      });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    // Get existing draft
    const existingDraft = await elasticService.getEmailById(id, emailAddresses);

    if (!existingDraft || !existingDraft.isDraft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }

    const providerDraftId = existingDraft.draftData?.providerDraftId;
    if (!providerDraftId) {
      return res.status(400).json({
        success: false,
        message: "Invalid draft: missing provider draft ID",
      });
    }

    console.log("Sending draft:", {
      elasticsearchId: id,
      providerDraftId,
      provider: existingDraft.provider,
      emailAddress: existingDraft.emailAddress,
      draftData: existingDraft.draftData,
    });

    // Send via provider
    let sentMessageId: string;
    if (existingDraft.provider === "gmail") {
      const gmailService = new GmailApiService({
        email: existingDraft.emailAddress,
      });
      sentMessageId = await gmailService.sendDraft(providerDraftId);
    } else {
      const outlookService = new OutlookApiService({
        email: existingDraft.emailAddress,
      });
      sentMessageId = await outlookService.sendDraft(providerDraftId);
    }

    // Update in Elasticsearch: convert draft to sent email
    await elasticService.updateEmail(id, {
      isDraft: false,
      draftData: undefined,
      labels: ["SENT"],
      providerLabels: ["SENT"],
      sentAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Draft sent successfully",
      data: {
        sentMessageId,
      },
    });
  } catch (error: any) {
    console.error("Failed to send draft:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send draft",
    });
  }
}, "sendDraft");

// --------------------
// GENERIC EMAIL OPERATIONS (Handles drafts too)
// --------------------

export const getEmailById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    try {
      const { emails: emailAddresses, error } = await getUserEmails(userId);
      if (error || emailAddresses.length === 0) {
        return res.status(403).json({
          success: false,
          message: error || "No connected email accounts",
        });
      }

      const elasticService = new ElasticsearchService(elasticClient);
      const email = await elasticService.getEmailById(id, emailAddresses);

      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Email not found",
        });
      }

      res.json({
        success: true,
        data: email,
      });
    } catch (error: any) {
      console.error("Failed to get email:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get email",
      });
    }
  },
  "getEmailById",
);

export const getEmailsByFolder = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { folder } = req.params;
    const { email, size, cursor } = req.query;

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

      const elasticService = new ElasticsearchService(elasticClient);

      // Parse cursor if provided
      let parsedCursor;
      if (cursor && typeof cursor === "string") {
        try {
          parsedCursor = JSON.parse(cursor);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid cursor format",
          });
        }
      }

      // Use search with label filter
      const folderName = Array.isArray(folder) ? folder[0] : folder;
      const result = await elasticService.searchEmails({
        emailAddresses,
        query: "", // Empty query for all emails in folder
        size: size ? parseInt(size as string) : 20,
        cursor: parsedCursor,
        filters: {
          labels: [folderName.toUpperCase()], // Convert to uppercase (DRAFT, INBOX, SENT, etc.)
        },
      });

      res.json({
        success: true,
        folder: folderName,
        total: result.total,
        emails: result.emails,
        nextCursor: result.nextCursor,
      });
    } catch (error: any) {
      console.error("Failed to get emails by folder:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get emails by folder",
      });
    }
  },
  "getEmailsByFolder",
);

export const updateEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id as string;
  const { to, cc, bcc, subject, html, text } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { emails: emailAddresses, error } = await getUserEmails(userId);
    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts",
      });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    // Get existing email
    const existingEmail = await elasticService.getEmailById(id, emailAddresses);

    if (!existingEmail) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    // Only drafts can be edited
    if (!existingEmail.isDraft) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit sent/received emails. Only drafts can be edited.",
      });
    }

    // Update draft at provider
    const providerDraftId = existingEmail.draftData?.providerDraftId;
    if (!providerDraftId) {
      return res.status(400).json({
        success: false,
        message: "Invalid draft: missing provider draft ID",
      });
    }

    // Update draft at provider
    if (existingEmail.provider === "gmail") {
      const gmailService = new GmailApiService({
        email: existingEmail.emailAddress,
      });
      await gmailService.updateDraft(providerDraftId, {
        mode: "new",
        from: existingEmail.emailAddress,
        to: to || existingEmail.to.map((t) => t.email),
        cc: cc || existingEmail.cc?.map((c) => c.email),
        bcc: bcc || existingEmail.bcc?.map((b) => b.email),
        subject: subject || existingEmail.subject,
        html: html || existingEmail.bodyHtml,
        text: text || existingEmail.bodyText,
      });
    } else {
      const outlookService = new OutlookApiService({
        email: existingEmail.emailAddress,
      });
      await outlookService.updateDraft(providerDraftId, {
        mode: "new",
        from: existingEmail.emailAddress,
        to: to || existingEmail.to.map((t) => t.email),
        cc: cc || existingEmail.cc?.map((c) => c.email),
        bcc: bcc || existingEmail.bcc?.map((b) => b.email),
        subject: subject || existingEmail.subject,
        html: html || existingEmail.bodyHtml,
        text: text || existingEmail.bodyText,
      });
    }

    // Update in Elasticsearch
    const updates: any = {};
    if (to)
      updates.to = to.map((email: string) => ({ email: email.toLowerCase() }));
    if (cc)
      updates.cc = cc.map((email: string) => ({ email: email.toLowerCase() }));
    if (bcc)
      updates.bcc = bcc.map((email: string) => ({
        email: email.toLowerCase(),
      }));
    if (subject) updates.subject = subject;
    if (html) updates.bodyHtml = html;
    if (text) updates.bodyText = text;
    if (subject || text || html) {
      updates.searchText = `${subject || existingEmail.subject} ${text || html || existingEmail.bodyText || existingEmail.bodyHtml || ""}`;
    }

    await elasticService.updateEmail(id, updates);

    res.json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (error: any) {
    console.error("Failed to update email:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update email",
    });
  }
}, "updateEmail");

export const deleteEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id as string;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { emails: emailAddresses, error } = await getUserEmails(userId);
    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts",
      });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    // Get existing email
    const existingEmail = await elasticService.getEmailById(id, emailAddresses);

    if (!existingEmail) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    // Only drafts can be permanently deleted
    if (!existingEmail.isDraft) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete sent/received emails. Only drafts can be deleted. Use email actions to move to trash.",
      });
    }

    // Delete draft from provider
    const providerDraftId = existingEmail.draftData?.providerDraftId;
    if (providerDraftId) {
      // Delete from provider
      if (existingEmail.provider === "gmail") {
        const gmailService = new GmailApiService({
          email: existingEmail.emailAddress,
        });
        await gmailService.deleteDraft(providerDraftId);
      } else {
        const outlookService = new OutlookApiService({
          email: existingEmail.emailAddress,
        });
        await outlookService.deleteDraft(providerDraftId);
      }
    }
    // Delete from Elasticsearch
    await elasticService.deleteEmail(id);

    res.json({
      success: true,
      message: "Email deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete email:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete email",
    });
  }
}, "deleteEmail");
