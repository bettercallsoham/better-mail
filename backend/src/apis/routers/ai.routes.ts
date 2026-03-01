import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { verifyEmailOwnership } from "../middleware/email-ownership";
import {
  validateThreadSummarization,
  validateRagChat,
  validateReplySuggestion,
} from "../validators/ai.validator";
import { summarizeThread, suggestReply } from "../controllers/ai.controller";

const router = Router();

router.post(
  "/threads/:threadId/summarize",
  verifyAccessToken(),
  validateThreadSummarization,
  verifyEmailOwnership,
  summarizeThread,
);

router.post(
  "/threads/:threadId/suggest-reply",
  verifyAccessToken(),
  validateReplySuggestion,
  verifyEmailOwnership,
  suggestReply,
);

export default router;
