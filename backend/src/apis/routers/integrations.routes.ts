import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as integrationsController from "../controllers/integrations.controller";
const router = Router();

router.get("/", verifyAccessToken(), integrationsController.getIntegrations);

router.post(
  "/telegram/link",
  verifyAccessToken(),
  integrationsController.getTelegramLink,
);

router.post(
  "/telegram/disconnect",
  verifyAccessToken(),
  integrationsController.disconnectTelegram,
);

export default router;
