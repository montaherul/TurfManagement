import { prisma } from '../config/db.js';

const notificationSelect = {
  id: true,
  organizationId: true,
  userId: true,
  event: true,
  title: true,
  message: true,
  payload: true,
  readAt: true,
  createdAt: true,
};

/**
 * In-app notification persistence. All queries are scoped to the owning
 * user — notifications are per-user rows so mark-as-read never leaks
 * across accounts.
 */
export const notificationRepository = {
  createMany: (rows) =>
    prisma.notification.createMany({ data: rows }),

  findByIdForUser: (id, userId) =>
    prisma.notification.findFirst({ where: { id, userId }, select: notificationSelect }),

  listForUser: async ({ userId, page = 1, limit = 20 }) => {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const where = { userId };
    const [data, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: notificationSelect,
      }),
      prisma.notification.count({ where }),
    ]);
    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  },

  unreadCount: (userId) =>
    prisma.notification.count({ where: { userId, readAt: null } }),

  markRead: (id, userId) =>
    prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    }),

  markAllRead: (userId) =>
    prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    }),

  deleteRead: (userId) =>
    prisma.notification.deleteMany({ where: { userId, readAt: { not: null } } }),
};

export default notificationRepository;