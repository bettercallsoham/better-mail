import { Request, Response } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import { asyncHandler } from "../utils/asyncHandler";
import {
  ConversationService,
  ConversationMessage,
} from "../../shared/services/elastic/conversation.service";
import { elasticClient } from "../../shared/config/elastic";
import { addConversationMessageJob } from "../../shared/queues/conversation.queue";

const conversationService = new ConversationService(elasticClient);

/**
 * POST /conversations
 */
export const createConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw createHttpError(401, "User not authenticated");

    const conversationId = crypto.randomUUID();
    const now = new Date();

    await conversationService.createOrUpdateSummary({
      conversationId,
      userId,
      title: "New Conversation",
      summary: "",
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      conversationId,
      userId,
      createdAt: now,
    });
  },
  "createConversation",
);

/**
 * POST /conversations/:conversationId/messages
 */
export const createMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createHttpError(400, "Validation failed", {
        errors: errors.array(),
      });
    }

    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId || !conversationId || Array.isArray(conversationId))
      throw createHttpError(401, "User not authenticated");

    const messageId = crypto.randomUUID();
    const userMessage: ConversationMessage = {
      messageId,
      conversationId,
      userId,
      role: "user",
      content,
      status: "queued",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await conversationService.createMessage(userMessage);

    await addConversationMessageJob({
      conversationId,
      userId,
      messageId,
      messageContent: content,
    });

    return res.status(202).json({
      messageId,
      conversationId,
      status: "queued",
    });
  },
  "createMessage",
);

/**
 * GET /conversations
 * Retrieve all conversation summaries for the authenticated user
 */
export const getConversations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw createHttpError(401, "User not authenticated");

    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor
      ? JSON.parse(req.query.cursor as string)
      : undefined;

    const { summaries, nextCursor } =
      await conversationService.getUserConversations(userId, { limit, cursor });

    return res.status(200).json({
      summaries,
      nextCursor: nextCursor ? JSON.stringify(nextCursor) : null,
      total: summaries.length,
    });
  },
  "getConversations",
);

/**
 * GET /conversations/:conversationId/messages
 * Support for cursor-based infinite scroll
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?.id;

  if (!userId || !conversationId || Array.isArray(conversationId))
    throw createHttpError(401, "User not authenticated");

  const limit = parseInt(req.query.limit as string) || 15;
  const cursor = req.query.cursor
    ? JSON.parse(req.query.cursor as string)
    : undefined;

  const { messages, nextCursor } = await conversationService.getRecentMessages(
    conversationId,
    { limit, cursor, includeIncomplete: true },
  );

  return res.status(200).json({
    conversationId,
    messages,
    nextCursor: nextCursor ? JSON.stringify(nextCursor) : null,
    total: messages.length,
  });
}, "getMessages");
