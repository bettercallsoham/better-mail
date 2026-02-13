import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { validateThreadSummarization } from "../validators/ai.validator";
import { summarizeThread } from "../controllers/ai.controller";

const router = Router();

/**
 * POST /api/ai/threads/:threadId/summarize
 * Summarize an email thread with AI streaming via Pusher
 */
router.post(
  "/threads/:threadId/summarize",
  verifyAccessToken(),
  validateThreadSummarization,
  summarizeThread,
);

export default router;
