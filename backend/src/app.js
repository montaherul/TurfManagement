import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import facilityRoutes from './routes/facilities.js';
import resourceRoutes from './routes/resources.js';
import slotRoutes from './routes/slots.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import blacklistRoutes from './routes/blacklist.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import uploadRoutes from './routes/upload.js';
import permissionRoutes from './routes/permissions.js';

/**
 * Express application factory — exportable so tests can build the app
 * without binding a port. server.js is the composition root.
 */
export const createApp = ({ redis = null } = {}) => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use(hpp());

  app.locals.redis = redis;

  const limiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    message: { success: false, message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
  });
  app.use('/api/', limiter);

  app.use('/uploads', express.static(env.uploadDir));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/facilities', facilityRoutes);
  app.use('/api/v1/resources', authMiddleware, tenantMiddleware, resourceRoutes);
  app.use('/api/v1/slots', slotRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/blacklist', blacklistRoutes);
  app.use('/api/v1/admin', authMiddleware, adminRoutes);
  app.use('/api/v1/notifications', authMiddleware, notificationRoutes);
  app.use('/api/v1/upload', authMiddleware, tenantMiddleware, uploadRoutes);
  app.use('/api/v1/permissions', authMiddleware, tenantMiddleware, permissionRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'TurfBook API is healthy',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      uptime: process.uptime(),
    });
  });

  app.use('/api/*', notFound);

  app.use(errorHandler);

  return app;
};

export default createApp;