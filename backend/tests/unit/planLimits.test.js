import { PLANS, checkLimit, getPlan, createPlanLimitService } from '../../src/services/planLimitService.js';

describe('plan definitions', () => {
  it('defines the tier limits from the requirements', () => {
    expect(PLANS.free).toEqual({ name: 'Free', fields: 2, inspections: 10, users: 3, priceBDT: 0 });
    expect(PLANS.basic).toEqual({ name: 'Basic', fields: 10, inspections: 100, users: 10, priceBDT: 2500 });
    expect(PLANS.professional.fields).toBe(Infinity);
    expect(PLANS.professional.inspections).toBe(Infinity);
    expect(PLANS.professional.users).toBe(Infinity);
  });

  it('falls back to free for unknown plan ids', () => {
    expect(getPlan('nonsense')).toBe(PLANS.free);
  });
});

describe('checkLimit', () => {
  it('allows usage below the limit', () => {
    expect(checkLimit('free', 'fields', 1)).toEqual({ ok: true, limit: 2, usage: 1 });
  });

  it('blocks usage at the limit (no headroom for another)', () => {
    expect(checkLimit('free', 'fields', 2)).toEqual({ ok: false, limit: 2, usage: 2 });
  });

  it('rejects usage above the limit', () => {
    expect(checkLimit('free', 'fields', 3)).toEqual({ ok: false, limit: 2, usage: 3 });
    expect(checkLimit('basic', 'inspections', 101)).toEqual({ ok: false, limit: 100, usage: 101 });
    expect(checkLimit('free', 'users', 4)).toEqual({ ok: false, limit: 3, usage: 4 });
  });

  it('never blocks professional plans', () => {
    expect(checkLimit('professional', 'fields', 100000).ok).toBe(true);
    expect(checkLimit('professional', 'inspections', 100000).ok).toBe(true);
  });

  it('ignores unknown resources', () => {
    expect(checkLimit('free', 'widgets', 999).ok).toBe(true);
  });
});

describe('assertWithinLimits', () => {
  const makeService = (subscription, usageByResource) => {
    const repo = {
      getByOrganization: async () => subscription,
    };
    const countingRepo = {
      count: async ({ organizationId, ...where }) => usageByResource[where.status === undefined ? 'inspections' : 'fields'] || 0,
    };
    return createPlanLimitService({
      subscriptionRepository: repo,
      fieldRepository: countingRepo,
      inspectionRepository: countingRepo,
      userRepository: countingRepo,
    });
  };

  it('throws PLAN_LIMIT_EXCEEDED with usage data when the limit is hit', async () => {
    const service = makeService({ planId: 'free', status: 'active' }, { fields: 2 });
    await expect(service.assertWithinLimits('org-1', 'fields')).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLAN_LIMIT_EXCEEDED',
      data: { planId: 'free', limit: 2, usage: 2 },
    });
  });

  it('passes when usage is below the limit', async () => {
    const service = makeService({ planId: 'basic', status: 'active' }, { fields: 2 });
    const result = await service.assertWithinLimits('org-1', 'fields');
    expect(result.ok).toBe(true);
    expect(result.limit).toBe(10);
  });

  it('treats orgs without an active subscription as free', async () => {
    const service = makeService(null, { users: 1 });
    const result = await service.assertWithinLimits('org-1', 'users');
    expect(result.limit).toBe(3);
  });
});

describe('assertWithinLimits — free tier resource enforcement (2 fields / 10 inspections / 3 users)', () => {
  const makeService = (subscription, usageByResource) => {
    const countingRepo = {
      count: async ({ organizationId, ...where }) => {
        const isFields = Object.prototype.hasOwnProperty.call(where, 'status');
        if (isFields) return usageByResource.fields || 0;
        return usageByResource[where.isActive !== undefined ? 'users' : 'inspections'] || 0;
      },
    };
    return createPlanLimitService({
      subscriptionRepository: { getByOrganization: async () => subscription },
      fieldRepository: countingRepo,
      inspectionRepository: countingRepo,
      userRepository: countingRepo,
    });
  };
  const activeFree = { planId: 'free', status: 'active' };

  it('fields: blocks at exactly 2 (limit reached)', async () => {
    const service = makeService(activeFree, { fields: 2 });
    await expect(service.assertWithinLimits('org-1', 'fields')).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLAN_LIMIT_EXCEEDED',
      data: { planId: 'free', limit: 2, usage: 2 },
    });
  });

  it('fields: passes below 2', async () => {
    const service = makeService(activeFree, { fields: 1 });
    const result = await service.assertWithinLimits('org-1', 'fields');
    expect(result).toMatchObject({ ok: true, planId: 'free', limit: 2, usage: 1 });
  });

  it('inspections: blocks at exactly 10 (limit reached)', async () => {
    const service = makeService(activeFree, { inspections: 10 });
    await expect(service.assertWithinLimits('org-1', 'inspections')).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLAN_LIMIT_EXCEEDED',
      data: { planId: 'free', limit: 10, usage: 10 },
    });
  });

  it('inspections: passes below 10', async () => {
    const service = makeService(activeFree, { inspections: 9 });
    const result = await service.assertWithinLimits('org-1', 'inspections');
    expect(result).toMatchObject({ ok: true, planId: 'free', limit: 10, usage: 9 });
  });

  it('users: blocks at exactly 3 (limit reached)', async () => {
    const service = makeService(activeFree, { users: 3 });
    await expect(service.assertWithinLimits('org-1', 'users')).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLAN_LIMIT_EXCEEDED',
      data: { planId: 'free', limit: 3, usage: 3 },
    });
  });

  it('users: passes below 3', async () => {
    const service = makeService(activeFree, { users: 2 });
    const result = await service.assertWithinLimits('org-1', 'users');
    expect(result).toMatchObject({ ok: true, planId: 'free', limit: 3, usage: 2 });
  });

  it('basic plan: passes at 9 fields (limit 10)', async () => {
    const service = makeService({ planId: 'basic', status: 'active' }, { fields: 9 });
    const result = await service.assertWithinLimits('org-1', 'fields');
    expect(result).toMatchObject({ ok: true, limit: 10, usage: 9 });
  });
});