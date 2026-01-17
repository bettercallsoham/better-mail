import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as connectEmailController from "../controllers/connect-email.controller";

const router = Router();

router.get("/gmail", verifyAccessToken(), connectEmailController.connectGmail);
router.get("/outlook", verifyAccessToken(), connectEmailController.connectOutlook);
// router.post("/imap", verifyAccessToken());

router.get("/gmail/callback", connectEmailController.gmailConnectCallback);
router.get("/outlook/callback", connectEmailController.outlookConnectCallback);

export default router;
