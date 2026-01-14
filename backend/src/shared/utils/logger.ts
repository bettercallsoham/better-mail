import * as Sentry from "@sentry/node";

type LogContext = Record<string, unknown>;

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(message, context ?? "");
  },

  warn(message: string, context?: LogContext) {
    console.warn(message, context ?? "");
  },

  error(message: string, context?: LogContext) {
    console.error(message, context ?? "");

    Sentry.captureMessage(message, {
      level: "error",
      extra: context,
    });
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(message, context ?? "");
    }
  },
};
