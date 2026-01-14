import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { logger } from "./shared/utils/logger";
const PORT = Number(process.env.APP_PORT) || 3001;

async function startServer() {
  const app = createApp();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    server.close(async (err) => {
      if (err) {
        logger.error("❌ Error during server close" + err.message);
        process.exit(1);
      }

      try {
        logger.info("✅ Cleanup complete. Exiting.");
        process.exit(0);
      } catch (e) {
        logger.error("❌ Cleanup failed", e);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error("⏰ Force shutdown");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  logger.error("❌ Failed to start server", err);
  process.exit(1);
});
