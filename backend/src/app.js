import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';
import organizationRoutes from './routes/organizations.js';
import fieldRoutes from './routes/fields.js';
import inspectionRoutes from './routes/inspections.js';
import workOrderRoutes from './routes/workOrders.js';
import subscriptionRoutes from './routes/subscriptions.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
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
  app.use(mongoSanitize());
  app.use(hpp());

  app.locals.redis = redis;

  const limiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    message: { success: false, message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
  });
  app.use('/api/', limiter);

  app.use('/uploads', express.static(env.uploadDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/organizations', authMiddleware, tenantMiddleware, organizationRoutes);
  app.use('/api/fields', authMiddleware, tenantMiddleware, fieldRoutes);
  app.use('/api/inspections', authMiddleware, tenantMiddleware, inspectionRoutes);
  app.use('/api/work-orders', authMiddleware, tenantMiddleware, workOrderRoutes);
  app.use('/api/subscriptions', authMiddleware, tenantMiddleware, subscriptionRoutes);
  app.use('/api/reports', authMiddleware, tenantMiddleware, reportRoutes);
  app.use('/api/upload', authMiddleware, tenantMiddleware, uploadRoutes);
  app.use('/api/admin', authMiddleware, adminRoutes);
  app.use('/api/permissions', authMiddleware, tenantMiddleware, permissionRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'TurfCare BD API is healthy',
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