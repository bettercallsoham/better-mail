import { Router } from "express";
import authRouter from "./routers/auth.routes";
import connectEmailRouter from "./routers/connect-email.routes";
import webhookRouter from "./routers/webhook.routes";
import mailRouter from "./routers/mail.routes";
import analyticsRouter from "./routers/analytics.routes";
import templateRouter from "./routers/template.routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/connect", connectEmailRouter);
router.use("/webhook", webhookRouter);
router.use("/mail", mailRouter);
router.use("/analytics", analyticsRouter);
router.use("/templates", templateRouter);
export default router;
