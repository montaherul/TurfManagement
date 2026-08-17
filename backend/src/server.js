import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initializeSocket } from './services/notifications/socketService.js';
import { startBillingScheduler } from './jobs/billingScheduler.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

let serverInstance = null;
let ioInstance = null;

const bootstrap = async () => {
  await connectDB();
  const redis = await connectRedis();

  const app = createApp({ redis });

  if (isVercel) {
    return app;
  }

  const server = http.createServer(app);
  serverInstance = server;

  const io = new Server(server, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });
  ioInstance = io;
  initializeSocket(io);

  server.listen(env.port, () => {
    logger.info(`TurfCare BD API running in ${env.nodeEnv} mode on port ${env.port}`);
    startBillingScheduler();
  });

  return app;
};

const app = await bootstrap();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  if (serverInstance) {
    serverInstance.close(async () => {
      await disconnectDB();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (serverInstance) {
    serverInstance.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  if (serverInstance) {
    serverInstance.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;
