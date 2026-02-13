import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import {
  validateThreadSummarization,
  validateRagChat,
} from "../validators/ai.validator";
import { summarizeThread, ragChat } from "../controllers/ai.controller";

const router = Router();

router.post(
  "/threads/:threadId/summarize",
  verifyAccessToken(),
  validateThreadSummarization,
  summarizeThread,
);

router.post("/chat", verifyAccessToken(), validateRagChat, ragChat);

export default router;
