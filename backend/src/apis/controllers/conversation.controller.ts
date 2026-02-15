import { Request, Response } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import { asyncHandler } from "../utils/asyncHandler";
import { ConversationService, ConversationMessage } from "../../shared/services/elastic/conversation.service";
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

    return res.status(201).json({
      conversationId,
      userId,
      createdAt: new Date(),
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
      throw createHttpError(400, "Validation failed", { errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId || !conversationId || Array.isArray(conversationId)) throw createHttpError(401, "User not authenticated");

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

    // Index the user's message immediately so it appears in the UI
    await conversationService.createMessage(userMessage);

    // Queue for AI Orchestration
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
 * GET /conversations/:conversationId/messages
 * Support for cursor-based infinite scroll
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?.id;

  if (!userId || !conversationId || Array.isArray(conversationId)) throw createHttpError(401, "User not authenticated");

  // PRINCIPAL UPGRADE: Parse cursor and limit from query params
  const limit = parseInt(req.query.limit as string) || 15;
  const cursor = req.query.cursor ? JSON.parse(req.query.cursor as string) : undefined;

  // We use getRecentMessages directly for paginated historical lookups
  const { messages, nextCursor } = await conversationService.getRecentMessages(
    conversationId,
    { limit, cursor, includeIncomplete: true }
  );

  return res.status(200).json({
    conversationId,
    messages,
    nextCursor: nextCursor ? JSON.stringify(nextCursor) : null,
    total: messages.length,
  });
}, "getMessages");