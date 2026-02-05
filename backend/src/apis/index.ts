import { Router } from "express";
import authRouter from "./routers/auth.routes";
import connectEmailRouter from "./routers/connect-email.routes";
import gmailPubSubRouter from "./routers/webhook.routes";
const router = Router();
router.use("/auth", authRouter);
router.use("/connect", connectEmailRouter);
router.use("/webhook", gmailPubSubRouter);
export default router;
