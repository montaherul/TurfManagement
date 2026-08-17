import multer from 'multer';
import { AppError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const PRISMA_ERROR_MAP = {
  P2002: { statusCode: 409, defaultMessage: 'A record with this value already exists' },
  P2025: { statusCode: 404, defaultMessage: 'Resource not found' },
  P2003: { statusCode: 409, defaultMessage: 'Related resource conflict' },
  P2010: { statusCode: 400, defaultMessage: 'Database query failed' },
  P2024: { statusCode: 503, defaultMessage: 'Database connection timeout' },
  P1000: { statusCode: 503, defaultMessage: 'Database authentication failed' },
  P1001: { statusCode: 503, defaultMessage: 'Database unreachable' },
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
      ...(err.data !== null && err.data !== undefined && { data: err.data }),
      ...(err.errors && { errors: err.errors }),
    });
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds the 10MB limit' : err.message;
    return res.status(400).json({ success: false, message, code: 'UPLOAD_ERROR' });
  }

  if (err.name === 'ZodError') {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token', code: 'UNAUTHORIZED' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
  }

  const prismaMeta = PRISMA_ERROR_MAP[err.code];
  if (prismaMeta) {
    let message = prismaMeta.defaultMessage;
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'value';
      message = `${target} already exists`;
    }
    if (err.code === 'P2025' && err.meta?.cause) {
      message = 'Resource not found';
    }
    return res.status(prismaMeta.statusCode).json({
      success: false,
      message,
      ...(err.code === 'P2002' && { code: 'DUPLICATE_RESOURCE' }),
      ...(err.code === 'P2025' && { code: 'NOT_FOUND' }),
    });
  }

  logger.error('Unhandled error:', { message: err.message, stack: err.stack });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(err.code && { code: err.code }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
};