import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from '../utils/logger.js';

/**
 * Request-scoped tenant context. The tenantMiddleware runs handlers inside
 * tenantContext.run({ facilityId }, ...) so the Prisma client extension can
 * automatically scope every query to the current facility (defense in depth).
 */
export const tenantContext = new AsyncLocalStorage();

const TENANT_MODELS = new Set([
  'User',
  'Resource',
  'Slot',
  'Booking',
  'Payment',
  'Package',
  'PackagePurchase',
  'Tournament',
  'TournamentTeam',
  'TournamentMatch',
  'Expense',
  'Blacklist',
  'Maintenance',
  'AuditLog',
  'Notification',
  'ScheduledReport',
]);

const notFoundError = () =>
  Object.assign(new Error('Record not found or access denied'), {
    code: 'P2025',
    clientVersion: '6',
  });

const getContextFacilityId = () => tenantContext.getStore()?.facilityId;

const injectFacility = (args, facilityId) => {
  args.where = args.where
    ? { AND: [args.where, { facilityId }] }
    : { facilityId };
};

const baseClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export const prisma = baseClient.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) injectFacility(args, facilityId);
        return query(args);
      },
      async findFirst({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) injectFacility(args, facilityId);
        return query(args);
      },
      async count({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) injectFacility(args, facilityId);
        return query(args);
      },
      async updateMany({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) injectFacility(args, facilityId);
        return query(args);
      },
      async deleteMany({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) injectFacility(args, facilityId);
        return query(args);
      },
      async aggregate({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) injectFacility(args, facilityId);
        return query(args);
      },
      async groupBy({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) {
          args.where = args.where
            ? { AND: [args.where, { facilityId }] }
            : { facilityId };
        }
        return query(args);
      },
      async update({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) {
          const owned = await baseClient[model].findFirst({
            where: { AND: [args.where, { facilityId }] },
            select: { id: true },
          });
          if (!owned) throw notFoundError();
        }
        return query(args);
      },
      async delete({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) {
          const owned = await baseClient[model].findFirst({
            where: { AND: [args.where, { facilityId }] },
            select: { id: true },
          });
          if (!owned) throw notFoundError();
        }
        return query(args);
      },
      async upsert({ model, args, query }) {
        const facilityId = getContextFacilityId();
        if (facilityId && TENANT_MODELS.has(model)) {
          const owned = await baseClient[model].findFirst({
            where: { AND: [args.where, { facilityId }] },
            select: { id: true },
          });
          if (!owned) throw notFoundError();
        }
        return query(args);
      },
    },
  },
});

export const connectDB = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('PostgreSQL connected via Prisma');
    return prisma;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
};

export const disconnectDB = async () => {
  await baseClient.$disconnect();
};