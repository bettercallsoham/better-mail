import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { verifyEmailOwnership } from "../middleware/email-ownership";
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
  verifyEmailOwnership,
  summarizeThread,
);

// router.post(
//   "/chat",
//   verifyAccessToken(),
//   validateRagChat,
//   verifyEmailOwnership,
//   ragChat,
// );

export default router;
