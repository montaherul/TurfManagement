jest.mock('../../src/config/env.js', () => ({
  env: {
    frontendUrl: 'http://localhost:5173',
    sslcommerz: { storeId: '', storePassword: '', isLive: false },
  },
  isSslcommerzConfigured: () => false,
}));

import { createSubscriptionService } from '../../src/services/subscriptionService.js';

const makeService = (subscriptions = []) => {
  const repo = {
    listForBillingSweep: async (now) =>
      subscriptions.filter(
        (s) =>
          s.status === 'active'
            ? s.nextBillingDate && s.nextBillingDate <= now
            : s.gracePeriodEnd && s.gracePeriodEnd <= now
      ),
    update: async (id, data) => {
      const target = subscriptions.find((s) => s.id === id);
      return { ...target, ...data };
    },
    getByOrganization: async () => null,
    upsertByOrganization: async (orgId, data) => ({ id: 'sub-1', organizationId: orgId, ...data }),
  };
  const orgRepo = { update: async () => {} };
  const audits = [];
  const auditLogRepository = { create: async (entry) => audits.push(entry) };
  const service = createSubscriptionService({
    subscriptionRepository: repo,
    organizationRepository: orgRepo,
    auditLogRepository,
    logger: { info: () => {}, error: () => {}, warn: () => {} },
  });
  return { service, audits, repo };
};

describe('runBillingCycle — subscription state machine', () => {
  it('marks an active plan with an expired period as past_due with a 7-day grace', async () => {
    const now = Date.now();
    const { service, audits } = makeService([
      {
        id: 'sub-1',
        organizationId: 'org-1',
        planId: 'basic',
        status: 'active',
        nextBillingDate: new Date(now - 1000),
      },
    ]);
    const result = await service.runBillingCycle();
    expect(result.markedPastDue).toBe(1);
    expect(audits[0].action).toBe('subscription.past_due');
    expect(audits[0].details.gracePeriodEnd.getTime() - now).toBeGreaterThanOrEqual(6.9 * 24 * 60 * 60 * 1000);
  });

  it('downgrades an expired past_due subscription to the free plan', async () => {
    const { service, audits, repo } = makeService([
      {
        id: 'sub-2',
        organizationId: 'org-2',
        planId: 'pro',
        status: 'past_due',
        gracePeriodEnd: new Date(Date.now() - 1000),
      },
    ]);
    const updates = [];
    repo.update = async (id, data) => {
      updates.push(data);
      return { id, ...data };
    };
    const result = await service.runBillingCycle();
    expect(result.downgraded).toBe(1);
    expect(updates[0]).toMatchObject({ planId: 'free', status: 'downgraded', amountBDT: 0 });
    expect(audits[0].action).toBe('subscription.downgraded');
    expect(audits[0].details).toEqual({ fromPlan: 'pro', toPlan: 'free' });
  });

  it('leaves active subscriptions with a future billing date untouched', async () => {
    const { service } = makeService([
      {
        id: 'sub-3',
        organizationId: 'org-3',
        planId: 'basic',
        status: 'active',
        nextBillingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    ]);
    const result = await service.runBillingCycle();
    expect(result).toEqual({ markedPastDue: 0, downgraded: 0 });
  });
});
