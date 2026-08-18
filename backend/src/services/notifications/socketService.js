import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let ioInstance = null;

/**
 * Socket.io singleton. initializeSocket must be called once from the
 * composition root; emitToFacility / emitToUser are safe to call
 * anywhere (they no-op if sockets are not initialized).
 */
export const initializeSocket = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const { facilityId, userId, role } = socket.user;

    if (facilityId) {
      socket.join(`facility:${facilityId}`);
    }

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join-room', (roomId) => {
      socket.join(String(roomId));
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(String(roomId));
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket user ${userId} (${role}) disconnected`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

export const emitToFacility = (facilityId, event, data) => {
  if (!ioInstance) return false;
  ioInstance.to(`facility:${facilityId}`).emit(event, data);
  return true;
};

export const emitToUser = (userId, event, data) => {
  if (!ioInstance) return false;
  ioInstance.to(`user:${userId}`).emit(event, data);
  return true;
};

export const getSocketIO = () => ioInstance;