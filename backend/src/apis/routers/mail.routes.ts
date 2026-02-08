import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as mailController from "../controllers/mail.controller";
const router = Router();

router.get(
  "/connected-accounts",
  verifyAccessToken(),
  mailController.getConnectedMailboxes,
);

router.get("/thread-emails", verifyAccessToken());

router.get("/folders", verifyAccessToken());

router.get("/search", verifyAccessToken());

router.get("/user-plan", verifyAccessToken());

router.post("/send-new-email", verifyAccessToken());
router.post("/reply-email", verifyAccessToken());

router.post("/email-action", verifyAccessToken());
// router.post("create-label", );

export default router;
