import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { logger } from "./shared/utils/logger";
import { connectDb } from "./shared/config/db";
import { elasticClient } from "./shared/config/elastic";
import { ElasticsearchService } from "./shared/services/elastic/elastic.service";
import { telegramBot } from "./shared/config/telegram";
import { setupTelegramBot } from "./modules/telegram/telegram.bot";
const PORT = Number(process.env.APP_PORT) || 3001;

async function startServer() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);

  const isElasticConnected = await elasticClient.ping();
  if (!isElasticConnected) {
    throw new Error("Elastic Service Not connected.");
  } else {
    logger.info("Elastic Server connected successfully");
  }

  const elasticService = new ElasticsearchService(elasticClient);
  await elasticService.ensureIndexes();

  

  setupTelegramBot();

  telegramBot.start({
    onStart: (telegramBotInfo) => {
      logger.info("telegramBot started as" + telegramBotInfo.username);
    },
  });

  server.listen(PORT, () => {
    logger.info(` Server running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    server.close(async (err) => {
      if (err) {
        logger.error("Error during server close" + err.message);
        process.exit(1);
      }

      try {
        logger.info("✅ Cleanup complete. Exiting.");
        process.exit(0);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.error(" Cleanup failed" + errorMessage);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error(" Force shutdown");
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
