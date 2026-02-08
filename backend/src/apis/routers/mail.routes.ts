import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as mailController from "../controllers/mail.controller";
import * as mailValidator from "../validators/mail.validator";
const router = Router();

router.get(
  "/connected-accounts",
  verifyAccessToken(),
  mailController.getConnectedMailboxes,
);

router.get(
  "/thread-emails",
  verifyAccessToken(),
  mailValidator.validateGetThreadEmails,
  mailController.getThreadEmails,
);

router.get(
  "/thread/:threadId",
  verifyAccessToken(),
  mailValidator.validateGetThreadById,
  mailController.getEmailsByThreadId,
);

router.get(
  "/folders",
  verifyAccessToken(),
  mailValidator.validateGetFolders,
  mailController.getFolders,
);

router.get("/search", verifyAccessToken());

router.get("/user-plan", verifyAccessToken());

router.post("/send-new-email", verifyAccessToken());
router.post("/reply-email", verifyAccessToken());

router.post("/email-action", verifyAccessToken());
// router.post("create-label", );

export default router;
