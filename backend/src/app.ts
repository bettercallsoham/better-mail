import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 1.0,
});
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./apis";

export function createApp() {
  const app = express();

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests, please try again later",
    },
  });

  Sentry.setupExpressErrorHandler(app);
  app.use(cors());
  app.use(helmet());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: false }));
  app.use(limiter);

  app.use("/api/v1", router);

  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const status = error.status || error.statusCode || 500;
      const message = error.message || "Internal Server Error";

      res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    }
  );
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}
