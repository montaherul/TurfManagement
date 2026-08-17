import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

const subscriptionSelect = {
  id: true,
  organizationId: true,
  planId: true,
  status: true,
  billingModel: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  inspectionsUsed: true,
  inspectionsLimit: true,
  amountBDT: true,
  currency: true,
  paymentMethod: true,
  nextBillingDate: true,
  gracePeriodEnd: true,
  canceledAt: true,
  createdAt: true,
  updatedAt: true,
};

export const subscriptionRepository = {
  ...createBaseRepository(prisma, 'Subscription', { select: subscriptionSelect }),

  getByOrganization: (organizationId) =>
    prisma.subscription.findFirst({ where: { organizationId }, select: subscriptionSelect }),

  updateByOrganization: (organizationId, data) =>
    prisma.subscription.update({ where: { organizationId }, data, select: subscriptionSelect }),

  upsertByOrganization: async (organizationId, data) => {
    const existing = await prisma.subscription.findFirst({ where: { organizationId }, select: { id: true } });
    if (existing) {
      return prisma.subscription.update({ where: { id: existing.id }, data, select: subscriptionSelect });
    }
    return prisma.subscription.create({ data: { ...data, organizationId }, select: subscriptionSelect });
  },

  /**
   * Subscriptions that need a billing decision at the given moment:
   * - active plans whose period ended (nextBillingDate passed)
   * - past_due plans whose grace period expired (gracePeriodEnd passed)
   */
  listForBillingSweep: (now) =>
    prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'past_due'] },
        planId: { not: 'free' },
        OR: [
          { status: 'active', nextBillingDate: { not: null, lte: now } },
          { status: 'past_due', gracePeriodEnd: { not: null, lte: now } },
        ],
      },
      select: subscriptionSelect,
    }),
};

export default subscriptionRepository;