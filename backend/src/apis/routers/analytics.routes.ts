import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as analyticsController from "../controllers/analytics.controller";
import * as analyticsValidator from "../validators/analytics.validator";

const router = Router();

router.get(
  "/overview",
  verifyAccessToken(),
  analyticsValidator.validateAnalyticsOverview,
  analyticsController.getAnalyticsOverview,
);

router.get(
  "/time-patterns",
  verifyAccessToken(),
  analyticsValidator.validateTimePatterns,
  analyticsController.getTimePatterns,
);

export default router;
