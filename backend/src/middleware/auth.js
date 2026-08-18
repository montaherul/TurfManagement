import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/ApiError.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token missing or invalid',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = decoded;
    req.facilityId = decoded.facilityId || null;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'UNAUTHORIZED',
    });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to access this resource',
      code: 'FORBIDDEN',
    });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], env.jwtSecret);
      req.user = decoded;
      req.facilityId = decoded.facilityId || null;
    } catch {
      req.user = null;
      req.facilityId = null;
    }
  }
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  try {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to access this resource', { code: 'FORBIDDEN' });
    }
    next();
  } catch (err) {
    next(err);
  }
};