import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { validateCreateMessage } from "../validators/conversation.validator";
import {
  createConversation,
  createMessage,
  getConversations,
  getMessages,
} from "../controllers/conversation.controller";

const router = Router();

router.get("/", verifyAccessToken(), getConversations);

router.post("/", verifyAccessToken(), createConversation);

router.post(
  "/:conversationId/messages",
  verifyAccessToken(),
  validateCreateMessage,
  createMessage,
);

router.get("/:conversationId/messages", verifyAccessToken(), getMessages);

export default router;
