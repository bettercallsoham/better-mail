import "dotenv/config";
import http from "http";
import { createApp } from "./app";

const PORT = Number(process.env.APP_PORT) || 3001;

async function startServer() {
  const app = createApp();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    server.close(async (err) => {
      if (err) {
        console.error("❌ Error during server close", err);
        process.exit(1);
      }

      try {
        console.log("✅ Cleanup complete. Exiting.");
        process.exit(0);
      } catch (e) {
        console.error("❌ Cleanup failed", e);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error("⏰ Force shutdown");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("❌ Failed to start server", err);
  process.exit(1);
});
