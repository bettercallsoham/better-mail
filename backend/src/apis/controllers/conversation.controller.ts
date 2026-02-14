import { Request, Response } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import { asyncHandler } from "../utils/asyncHandler";
import { ConversationService } from "../../shared/services/elastic/conversation.service";
import { elasticClient } from "../../shared/config/elastic";
import { addConversationMessageJob } from "../../shared/queues/conversation.queue";
import { ConversationMessage } from "../../shared/services/elastic/conversation.service";

const conversationService = new ConversationService(elasticClient);

/**
 * POST /conversations
 * Create a new conversation
 */
export const createConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw createHttpError(401, "User not authenticated");
    }

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
 * Create a new message and queue for AI processing
 */
export const createMessage = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createHttpError(400, "Validation failed", {
        errors: errors.array(),
      });
    }

    const conversationId = req.params.conversationId as string;
    const { content } = req.body;
    const userId = req.user?.id;

    console.log("content :", content);
    if (!userId) {
      throw createHttpError(401, "User not authenticated");
    }

    // Create user message in Elasticsearch (status: queued)
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

    // Add job to BullMQ for async processing
    await addConversationMessageJob({
      conversationId,
      userId,
      messageId,
      messageContent: content,
    });

    // Return immediately with 202 Accepted
    return res.status(202).json({
      messageId,
      conversationId,
      status: "queued",
      message: "Message queued for processing",
    });
  },
  "createMesage",
);

/**
 * GET /conversations/:conversationId/messages
 * Get all messages in a conversation
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw createHttpError(401, "User not authenticated");
  }

  const { messages } =
    await conversationService.getConversationContext(conversationId);

  return res.status(200).json({
    conversationId,
    messages,
    total: messages.length,
  });
}, "getMessage");
