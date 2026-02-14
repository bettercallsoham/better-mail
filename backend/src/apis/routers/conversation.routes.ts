import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { validateCreateMessage } from "../validators/conversation.validator";
import {
  createConversation,
  createMessage,
  getMessages,
} from "../controllers/conversation.controller";

const router = Router();

/**
 * POST /conversations
 * Create a new conversation
 */
router.post("/", verifyAccessToken(), createConversation);

/**
 * POST /conversations/:conversationId/messages
 * Create a new message in a conversation
 */
router.post(
  "/:conversationId/messages",
  verifyAccessToken(),
  validateCreateMessage,
  createMessage,
);

/**
 * GET /conversations/:conversationId/messages
 * Get all messages from a conversation
 */
router.get("/:conversationId/messages", verifyAccessToken(), getMessages);

export default router;
