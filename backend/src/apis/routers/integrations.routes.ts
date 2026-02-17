import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as integrationsController from "../controllers/integrations.controller";
const router = Router();

router.post(
  "/telegram",
  verifyAccessToken(),
  integrationsController.getTelegramLink,
);

export default router;
