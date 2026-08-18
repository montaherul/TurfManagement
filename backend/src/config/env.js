import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of requiredInProduction) {
  if (process.env.NODE_ENV === 'production' && !process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? '100' : '1000'), 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (15 * 60 * 1000), 10),
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    isLive: (process.env.SSLCOMMERZ_IS_LIVE || 'false') === 'true',
  },
  bkash: {
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    sandbox: (process.env.BKASH_SANDBOX || 'true') === 'true',
  },
  nagad: {
    merchantId: process.env.NAGAD_MERCHANT_ID || '',
    secretKey: process.env.NAGAD_SECRET_KEY || '',
    sandbox: (process.env.NAGAD_SANDBOX || 'true') === 'true',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'no-reply@turfcarebd.com',
  },
  isProduction: process.env.NODE_ENV === 'production',
};

export const isSslcommerzConfigured = () =>
  Boolean(env.sslcommerz.storeId && env.sslcommerz.storePassword);

export const isSendgridConfigured = () => Boolean(env.sendgrid.apiKey);
