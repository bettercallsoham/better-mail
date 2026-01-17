import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as connectEmailController from "../controllers/connect-email.controller";

const router = Router();

router.get("/gmail", verifyAccessToken(), connectEmailController.connectGmail);
router.get("/outlook", verifyAccessToken(), );
router.post("/imap", verifyAccessToken());

router.get("/gmail/callback");
router.get("/outlook/callback");

export default router;
