import * as Sentry from "@sentry/node";
import cookieparser from "cookie-parser";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 1.0,
});

Sentry.metrics.count("button_click", 1);
Sentry.metrics.gauge("page_load_time", 150);
Sentry.metrics.distribution("response_time", 200);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./apis";
import path from "path";

import serverAdapter from "./shared/config/bullboard";
import {
  bullBoardAuth,
  bullBoardEnvCheck,
} from "./apis/middleware/bullboard-auth";
import { allowOnlyMyIP } from "./apis/middleware/checkIp";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  const corsOptions = {
    origin: [
      "http://localhost:3000",
      "https://staging.abhisharma.app",
      "https://abhisharma.app",
      "https://mail.abhisharma.app",
    ],
    credentials: true,
  };

  app.use(cors(corsOptions));
  //app.options("*", cors(corsOptions));

  app.use(express.static(path.join(__dirname, "../public")));
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests, please try again later",
    },
  });

  Sentry.setupExpressErrorHandler(app);
  app.use(helmet());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: false }));
  app.use(limiter);

  app.use(cookieparser());

  app.use(
    "/admin/queues",
    allowOnlyMyIP,
    bullBoardEnvCheck,
    bullBoardAuth,
    serverAdapter.getRouter(),
  );

  app.use("/api/v1", router);

  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const status = error.status || error.statusCode || 500;
      const message = error.message || "Internal Server Error";

      res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    },
  );
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}
