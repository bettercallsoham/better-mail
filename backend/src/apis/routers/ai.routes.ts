import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import { validateThreadSummarization } from "../validators/ai.validator";

const router = Router();

router.get(
  "/summarize/:threadId",
  verifyAccessToken(),
  validateThreadSummarization,
  
);



export default router;
