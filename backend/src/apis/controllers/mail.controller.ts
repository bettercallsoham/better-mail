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
import { threadNoteService } from "../../shared/services/thread-notes/thread-note.service";
import { logger } from "@sentry/node";

// --------------------
// TYPES
// --------------------

interface EmailBody {
  bodyHtml: string | null;
  bodyText: string | null;
}

interface BatchEmailInput {
  providerMessageId: string;
  provider: "gmail" | "outlook";
  // Metadata already known by frontend — returned as-is so frontend can
  // merge body into its existing thread data without extra mapping
  emailId?: string;
  threadId?: string;
}

interface BatchEmailResult extends BatchEmailInput {
  bodyHtml: string | null;
  bodyText: string | null;
  bodyFetchFailed: boolean;
}

// --------------------
// CONNECTED MAILBOXES
// --------------------

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
      where: { user_id: userId },
      attributes: [
        "id",
        "email",
        "name",
        "provider",
        "avatar_url",
        "created_at",
      ],
    });

    res.json({ success: true, data: EmailAccounts });
  },
  "getConnectedMailboxes",
);

// --------------------
// THREAD LIST
// --------------------

export const getThreadEmails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { email, size, page, folder } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      email as string | undefined,
    );

    if (error) {
      return res.status(403).json({ success: false, message: error });
    }

    if (emailAddresses.length === 0) {
      return res.json({
        success: true,
        data: { threads: [], nextPage: null },
        message: "No connected email accounts",
      });
    }

    let allowedEmails = emailAddresses;

    if (email && typeof email === "string") {
      if (!emailAddresses.includes(email)) {
        return res.status(403).json({
          success: false,
          message: "Access denied for this email account",
        });
      }
      allowedEmails = [email];
    }

    const elasticService = new ElasticsearchService(elasticClient);

    const threads = await elasticService.getInboxThreads({
      emailAddresses: allowedEmails,
      size: size ? parseInt(size as string, 10) : 20,
      page: page ? parseInt(page as string, 10) : 0,
      folder: (folder as string) ?? "inbox",
    });

    return res.json({ success: true, data: threads });
  },
  "getThreadEmails",
);

// --------------------
// THREAD METADATA (no body)
// --------------------
export const getEmailsByThreadId = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { threadId } = req.params;
    const { email } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      email as string | undefined,
    );


    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error ?? "No connected email accounts",
      });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    const { emails: rawEmails, total } =
      await elasticService.getEmailsByThreadId({
        threadId: Array.isArray(threadId) ? threadId[0] : threadId,
        emailAddresses,
      });

    if (rawEmails.length === 0) {
      return res.json({ success: true, data: { total: 0, emails: [] } });
    }
    console.log("bodyMap");
    const threadGroups = groupByProviderThread(rawEmails);
    console.log(threadGroups);

    const bodyMap = await fetchAllThreadBodies(threadGroups);

    console.log("bodyMap");
    console.log(bodyMap);

    // Step 3: merge metadata + bodies
    const emails = rawEmails.map((email) => {
      const { embedding, ...metadata } = email;
      const body = bodyMap.get(email.providerMessageId);

      return {
        ...metadata,
        bodyHtml: body?.bodyHtml ?? null,
        bodyText: body?.bodyText ?? null,
        bodyFetchFailed:
          !body || (body.bodyHtml === null && body.bodyText === null),
      };
    });

    return res.json({ success: true, data: { total, emails } });
  },
  "getEmailsByThreadId",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ThreadGroup {
  provider: "gmail" | "outlook";
  providerThreadId: string;
  emailAddress: string;
}

/**
 * Deduplicates ES emails into unique (provider, providerThreadId) pairs.
 * All messages in a thread share the same providerThreadId — we only
 * need one API call per thread, not one per message.
 */
const groupByProviderThread = (
  emails: UnifiedEmailDocument[],
): ThreadGroup[] => {
  const seen = new Set<string>();
  const groups: ThreadGroup[] = [];

  for (const email of emails) {
    const key = `${email.provider}:${email.providerThreadId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    groups.push({
      provider: email.provider as "gmail" | "outlook",
      providerThreadId: email.providerThreadId,
      emailAddress: email.emailAddress,
    });
  }

  return groups;
};

const fetchAllThreadBodies = async (
  groups: ThreadGroup[],
): Promise<Map<string, EmailBody>> => {
  const maps = await Promise.all(
    groups.map(({ provider, providerThreadId, emailAddress }) =>
      provider === "gmail"
        ? new GmailApiService({ email: emailAddress }).fetchThreadBodies(
            providerThreadId,
          )
        : new OutlookApiService({ email: emailAddress }).fetchThreadBodies(
            providerThreadId,
          ),
    ),
  );

  return new Map(maps.flatMap((m) => [...m]));
};

export const batchGetEmailBodies = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { emailAddress, messages } = req.body as {
      emailAddress: string;
      messages: BatchEmailInput[];
    };

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "messages must be a non-empty array",
      });
    }

    if (messages.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Maximum 20 messages per batch request",
      });
    }

    // Verify user owns this emailAddress
    const { emails: emailAddresses, error } = await getUserEmails(
      userId,
      emailAddress,
    );

    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "You don't have access to this email account",
      });
    }

    const targetEmail = emailAddress || emailAddresses[0];

    if (!emailAddresses.includes(targetEmail)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this email account",
      });
    }

    // Split messages by provider
    const gmailMessages = messages.filter((m) => m.provider === "gmail");
    const outlookMessages = messages.filter((m) => m.provider === "outlook");

    // Fetch from both providers in parallel — nothing stored
    const [gmailBodies, outlookBodies] = await Promise.all([
      gmailMessages.length > 0
        ? fetchGmailBodies(targetEmail, gmailMessages)
        : Promise.resolve(new Map<string, EmailBody>()),
      outlookMessages.length > 0
        ? fetchOutlookBodies(targetEmail, outlookMessages)
        : Promise.resolve(new Map<string, EmailBody>()),
    ]);

    const allBodies = new Map<string, EmailBody>([
      ...gmailBodies,
      ...outlookBodies,
    ]);

    // Build response — echo back all input fields so frontend can map results
    // without needing an index or secondary lookup
    const results: BatchEmailResult[] = messages.map((msg) => {
      const body = allBodies.get(msg.providerMessageId);
      const failed =
        !body || (body.bodyHtml === null && body.bodyText === null);

      return {
        ...msg,
        bodyHtml: body?.bodyHtml ?? null,
        bodyText: body?.bodyText ?? null,
        bodyFetchFailed: failed,
      };
    });

    return res.json({
      success: true,
      results,
    });
  },
  "batchGetEmailBodies",
);

// --------------------
// PRIVATE FETCH HELPERS
// --------------------

async function fetchGmailBodies(
  emailAddress: string,
  messages: BatchEmailInput[],
): Promise<Map<string, EmailBody>> {
  const gmailService = new GmailApiService({ email: emailAddress });
  const ids = messages.map((m) => m.providerMessageId);
  // fetchMessageBodies handles parallel fetch + per-item error isolation
  return gmailService.fetchMessageBodies(ids);
}

async function fetchOutlookBodies(
  emailAddress: string,
  messages: BatchEmailInput[],
): Promise<Map<string, EmailBody>> {
  const outlookService = new OutlookApiService({ email: emailAddress });
  const ids = messages.map((m) => m.providerMessageId);
  return outlookService.fetchMessageBodies(ids);
}

// --------------------
// FOLDERS
// --------------------

export const getFolders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { email } = req.query;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

  const { emails: emailAddresses, error } = await getUserEmails(
    userId,
    email as string | undefined,
  );

  if (error) {
    return res.status(403).json({ success: false, message: error });
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

  res.json({ success: true, data: folderCounts });
}, "getFolders");

// --------------------
// SEND / REPLY
// --------------------

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
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

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
      return res
        .status(400)
        .json({ success: false, message: "Unsupported email provider" });
    }

    res.json({
      success: true,
      data: { messageId },
      message: "Email sent successfully",
    });
  } catch (error: any) {
    logger.error("Failed to send reply:", error);

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
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

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
      return res
        .status(400)
        .json({ success: false, message: "Unsupported email provider" });
    }

    res.json({
      success: true,
      data: { messageId },
      message: "Email sent successfully",
    });
  } catch (error: any) {
    logger.error("Failed to send email:", error);

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

// --------------------
// EMAIL ACTIONS
// --------------------

export const emailAction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, provider, messageIds, action } = req.body;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

  const { emails: emailAddresses, error } = await getUserEmails(userId, from);

  if (error || emailAddresses.length === 0) {
    return res.status(403).json({
      success: false,
      message: error || "You don't have access to this email account",
    });
  }

  try {
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

    res.json({ success: true, action, updated: messageIds.length, messageIds });
  } catch (error: any) {
    logger.error("Failed to perform email action:", error);

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

// --------------------
// SEARCH
// --------------------

export const searchEmails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
      query,
      from: fromEmail,
      size,
      page,
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
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

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

    let parsedLabels: string[] | undefined;
    if (labels && typeof labels === "string") {
      try {
        parsedLabels = JSON.parse(labels);
      } catch {
        parsedLabels = [labels];
      }
    }

    const elasticService = new ElasticsearchService(elasticClient);
    const startTime = Date.now();

    const result = await elasticService.searchEmails({
      emailAddresses,
      query: query as string,
      size: size ? parseInt(size as string, 10) : 20,
      page: page ? parseInt(page as string, 10) : 0,
      filters: {
        isRead: isRead !== undefined ? isRead === "true" : undefined,
        isStarred: isStarred !== undefined ? isStarred === "true" : undefined,
        isArchived:
          isArchived !== undefined ? isArchived === "true" : undefined,
        hasAttachments:
          hasAttachments !== undefined ? hasAttachments === "true" : undefined,
        from: filterFrom as string | undefined,
        to: filterTo as string | undefined,
        labels: parsedLabels,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      },
    });

    const executionTimeMs = Date.now() - startTime;

    searchHistoryQueue
      .add("store-search", {
        userId,
        searchText: query as string,
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
        resultsCount: result.total,
        executionTimeMs,
        emailAddresses,
      })
      .catch((err) => logger.error("Failed to queue search history:", err));

    return res.json({
      success: true,
      query,
      total: result.total,
      page: result.page,
      nextPage: result.nextPage,
      emails: result.emails,
    });
  },
  "searchEmails",
);

// --------------------
// INBOX ZERO
// --------------------

export const getInboxZero = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { from: fromEmail, size, page } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

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

      const result = await elasticService.getInboxZeroEmails({
        emailAddresses,
        size: size ? parseInt(size as string) : 20,
        page: page ? parseInt(page as string) : 0,
      });

      res.json({
        success: true,
        total: result.total,
        emails: result.emails,
        nextPage: result.nextPage,
      });
    } catch (error: any) {
      logger.error("Failed to fetch inbox zero emails:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inbox zero emails",
      });
    }
  },
  "getInboxZero",
);

// --------------------
// INBOX STATE
// --------------------

export const updateInboxState = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { email, provider, messageIds, action, snoozeUntil } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

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
      logger.error("Failed to update inbox state:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update inbox state",
      });
    }
  },
  "updateInboxState",
);

// --------------------
// SAVED SEARCHES
// --------------------

export const createSavedSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { name, description, query, isPinned, color } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
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

      res.status(201).json({ success: true, data: doc });
    } catch (error: any) {
      logger.error("Failed to create saved search:", error);
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
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const searches = await elasticService.getSavedSearchesByUser(userId);
      res.json({ success: true, data: searches });
    } catch (error: any) {
      logger.error("Failed to get saved searches:", error);
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
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!id || Array.isArray(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid search ID" });
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

      res.json({ success: true, message: "Saved search updated" });
    } catch (error: any) {
      logger.error("Failed to update saved search:", error);
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
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!id || Array.isArray(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid search ID" });
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

      res.json({ success: true, message: "Saved search deleted" });
    } catch (error: any) {
      logger.error("Failed to delete saved search:", error);
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
    const { size, page } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!id || Array.isArray(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid search ID" });
    }

    const elasticService = new ElasticsearchService(elasticClient);

    const savedSearch = await elasticService.getSavedSearchById(id, userId);
    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found or access denied",
      });
    }

    await elasticService.incrementSearchUsage(id);

    let emailAddresses = savedSearch.query.emailAddresses;
    if (!emailAddresses?.length) {
      const { emails, error } = await getUserEmails(userId);
      if (error || emails.length === 0) {
        return res.status(403).json({
          success: false,
          message: error || "No connected email accounts found",
        });
      }
      emailAddresses = emails;
    }

    const result = await elasticService.searchEmails({
      emailAddresses,
      query: savedSearch.query.searchText,
      size: size ? parseInt(size as string, 10) : 20,
      page: page ? parseInt(page as string, 10) : 0,
      filters: savedSearch.query.filters,
    });

    return res.json({
      success: true,
      savedSearch: { id: savedSearch.id, name: savedSearch.name },
      total: result.total,
      page: result.page,
      nextPage: result.nextPage,
      emails: result.emails,
    });
  },
  "executeSavedSearch",
);

export const getRecentSearches = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { limit } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);
      const searches = await elasticService.getRecentSearches(
        userId,
        limit ? parseInt(limit as string) : 10,
      );
      res.json({ success: true, data: searches });
    } catch (error: any) {
      logger.error("Failed to get recent searches:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get recent searches",
      });
    }
  },
  "getRecentSearches",
);

// --------------------
// DRAFTS
// --------------------

export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, provider, to, cc, bcc, subject, html, text, threadId } =
    req.body;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
  }

  try {
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

    // Index draft metadata only — no body stored
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
      // No bodyText / bodyHtml stored
      snippet: (text || html || "").substring(0, 200),
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
    };

    await elasticService.saveDraft(draftDoc);

    res.json({ success: true, data: { id: draftDoc.id, providerDraftId } });
  } catch (error: any) {
    logger.error("Failed to create draft:", error);
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
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
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
    const existingDraft = await elasticService.getEmailById(id, emailAddresses);

    if (!existingDraft || !existingDraft.isDraft) {
      return res
        .status(404)
        .json({ success: false, message: "Draft not found" });
    }

    const providerDraftId = existingDraft.draftData?.providerDraftId;
    if (!providerDraftId) {
      return res.status(400).json({
        success: false,
        message: "Invalid draft: missing provider draft ID",
      });
    }

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
      data: { sentMessageId },
    });
  } catch (error: any) {
    logger.error("Failed to send draft:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send draft",
    });
  }
}, "sendDraft");

export const getEmailById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const id = req.params.id as string;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
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
        return res
          .status(404)
          .json({ success: false, message: "Email not found" });
      }

      // Strip body fields
      const { bodyText, bodyHtml, searchText, embedding, ...metadata } =
        email as any;

      res.json({ success: true, data: metadata });
    } catch (error: any) {
      logger.error("Failed to get email:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get email",
      });
    }
  },
  "getEmailById",
);

export const updateEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id as string;
  const { to, cc, bcc, subject, html, text } = req.body;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
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
    const existingEmail = await elasticService.getEmailById(id, emailAddresses);

    if (!existingEmail) {
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    if (!existingEmail.isDraft) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit sent/received emails. Only drafts can be edited.",
      });
    }

    const providerDraftId = existingEmail.draftData?.providerDraftId;
    if (!providerDraftId) {
      return res.status(400).json({
        success: false,
        message: "Invalid draft: missing provider draft ID",
      });
    }

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
        html,
        text,
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
        html,
        text,
      });
    }

    // Update metadata only in ES — no body stored
    const updates: any = {};
    if (to) updates.to = to.map((e: string) => ({ email: e.toLowerCase() }));
    if (cc) updates.cc = cc.map((e: string) => ({ email: e.toLowerCase() }));
    if (bcc) updates.bcc = bcc.map((e: string) => ({ email: e.toLowerCase() }));
    if (subject) updates.subject = subject;
    if (text || html) updates.snippet = (text || html || "").substring(0, 200);

    await elasticService.updateEmail(id, updates);

    res.json({ success: true, message: "Email updated successfully" });
  } catch (error: any) {
    logger.error("Failed to update email:", error);
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
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated" });
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
    const existingEmail = await elasticService.getEmailById(id, emailAddresses);

    if (!existingEmail) {
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    if (!existingEmail.isDraft) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete sent/received emails. Only drafts can be deleted.",
      });
    }

    const providerDraftId = existingEmail.draftData?.providerDraftId;
    if (providerDraftId) {
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

    await elasticService.deleteEmail(id);

    res.json({ success: true, message: "Email deleted successfully" });
  } catch (error: any) {
    logger.error("Failed to delete email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete email",
    });
  }
}, "deleteEmail");

// --------------------
// THREAD NOTES
// --------------------

export const upsertThreadNote = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const emailAddresses = await getUserEmails(userId);
    if (emailAddresses.emails.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No connected email accounts found" });
    }

    const { threadId } = req.params;
    const { content, emailAddress: requestedEmail } = req.body;

    const emailAddress =
      requestedEmail && emailAddresses.emails.includes(requestedEmail)
        ? requestedEmail
        : emailAddresses.emails[0];

    const note = await threadNoteService.upsertNote(
      emailAddress,
      threadId as string,
      content,
    );

    res
      .status(200)
      .json({ success: true, message: "Note saved successfully", data: note });
  },
  "upsertThreadNote",
);

export const getThreadNote = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const threadIdParam = req.params.threadId;
    const emailAddressParam = req.params.emailAddress;

    const threadId =
      typeof threadIdParam === "string" ? threadIdParam : undefined;

    if (!threadId) {
      return res
        .status(400)
        .json({ success: false, message: "Thread ID is required" });
    }

    const emailAddresses = await getUserEmails(userId);

    if (!emailAddresses.emails.length) {
      return res
        .status(400)
        .json({ success: false, message: "No connected email accounts found" });
    }

    const emailAddress =
      typeof emailAddressParam === "string" ? emailAddressParam : undefined;

    const emailToUse =
      emailAddress && emailAddresses.emails.includes(emailAddress)
        ? emailAddress
        : emailAddresses.emails[0];

    const note = await threadNoteService.getNote(emailToUse, threadId);

    return res.status(200).json({ success: true, data: note });
  },
  "getThreadNote",
);

export const deleteThreadNote = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const emailAddresses = await getUserEmails(userId);
    if (emailAddresses.emails.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No connected email accounts found" });
    }

    const { threadId } = req.params;

    const deleted = await threadNoteService.deleteNote(
      emailAddresses.emails[0],
      threadId as string,
    );

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Note deleted successfully" });
  },
  "deleteThreadNote",
);

export const listThreadNotes = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const emailAddresses = await getUserEmails(userId);
    if (emailAddresses.emails.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No connected email accounts found" });
    }

    const { limit, offset, query } = req.query;

    const result = await threadNoteService.listNotes(
      emailAddresses.emails,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined,
      query ? (query as string) : undefined,
    );

    res.status(200).json({
      success: true,
      data: {
        notes: result.notes,
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  },
  "listThreadNotes",
);

// --------------------
// SENDER / SUGGESTIONS
// --------------------

export const getEmailsFromUser = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { senderEmail } = req.params;
    const { size, page } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { emails: emailAddresses, error } = await getUserEmails(userId);

    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);

      const result = await elasticService.getEmailsFromSender({
        emailAddresses,
        senderEmail: senderEmail as string,
        size: size ? parseInt(size as string, 10) : 20,
        page: page ? parseInt(page as string, 10) : 0,
      });

      res.json({
        success: true,
        data: {
          sender: { email: senderEmail, totalCount: result.total },
          emails: result.emails,
          nextPage: result.nextPage,
        },
      });
    } catch (error: any) {
      logger.error("Failed to get emails from user:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get emails from user",
      });
    }
  },
  "getEmailsFromUser",
);

export const getEmailSuggestions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { query, limit } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { emails: emailAddresses, error } = await getUserEmails(userId);

    if (error || emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: error || "No connected email accounts",
      });
    }

    try {
      const elasticService = new ElasticsearchService(elasticClient);

      const result = await elasticService.getEmailSuggestions({
        emailAddresses,
        query: query as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.json({
        success: true,
        data: { suggestions: result.suggestions, total: result.total },
      });
    } catch (error: any) {
      logger.error("Failed to get email suggestions:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get email suggestions",
      });
    }
  },
  "getEmailSuggestions",
);
