import { Router } from "express";
import authRouter from "./routers/auth.routes";
import connectEmailRouter from "./routers/connect-email.routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/connect", connectEmailRouter);
export default router;
