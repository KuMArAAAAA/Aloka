// src/server.js
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, prisma } from "./config/database.js";
import { startEventListener, stopEventListener } from "./services/eventListener.service.js";
import { logger } from "./utils/logger.js";

const PORT = env.PORT || 3000;

const startServer = async () => {
  // 1. Connect to Database
  await connectDatabase();

  // 2. Start on-chain event listener (background, non-blocking)
  startEventListener().catch((err) => {
    logger.warn(`[EventListener] Could not start: ${err.message}`);
  });

  // 3. Start HTTP server
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Aloka API server running on port ${PORT} [${env.NODE_ENV}]`);
    logger.info(`📡 Blockchain: Polygon Amoy | Escrow: ${env.ESCROW_CONTRACT_ADDRESS}`);
    logger.info(`📊 Public stats: http://localhost:${PORT}/api/v1/public/stats`);
    logger.info(`💊 Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    stopEventListener();
    server.close(async () => {
      logger.info("HTTP server closed.");
      await prisma.$disconnect();
      logger.info("Database disconnected.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((err) => {
  logger.error(`Fatal server error: ${err.message}`);
  process.exit(1);
});
