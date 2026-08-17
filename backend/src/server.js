import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initializeSocket } from './services/notifications/socketService.js';
import { startBillingScheduler } from './jobs/billingScheduler.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  await connectDB();
  const redis = await connectRedis();

  const app = createApp({ redis });
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });
  initializeSocket(io);

  server.listen(env.port, () => {
    logger.info(`TurfCare BD API running in ${env.nodeEnv} mode on port ${env.port}`);
    startBillingScheduler();
  });

  return { app, server, io };
};

const { server } = await startServer();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

export default server;
