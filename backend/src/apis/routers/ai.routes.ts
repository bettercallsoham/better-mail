import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { validateThreadSummarization } from "../validators/ai.validator";
import { summarizeThread } from "../controllers/ai.controller";

const router = Router();

router.post(
  "/threads/:threadId/summarize",
  verifyAccessToken(),
  validateThreadSummarization,
  summarizeThread,
);



export default router;
