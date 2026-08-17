import { AppError } from '../utils/ApiError.js';

/**
 * Plan definitions — usage limits per resource.
 * Free = 2 fields / 10 inspections / 3 users
 * Basic = 10 fields / 100 inspections / 10 users
 * Professional = unlimited
 */
export const PLANS = {
  free: { name: 'Free', fields: 2, inspections: 10, users: 3, priceBDT: 0 },
  basic: { name: 'Basic', fields: 10, inspections: 100, users: 10, priceBDT: 2500 },
  professional: { name: 'Professional', fields: Number.POSITIVE_INFINITY, inspections: Number.POSITIVE_INFINITY, users: Number.POSITIVE_INFINITY, priceBDT: 8000 },
};

export const getPlan = (planId) => PLANS[planId] || PLANS.free;

/**
 * Pure limit check — returns { ok, limit, usage } so it is trivially testable.
 */
export const checkLimit = (planId, resource, usage) => {
  const plan = getPlan(planId);
  const limit = plan[resource];
  if (limit === undefined) return { ok: true, limit: null, usage };
  return { ok: usage < limit, limit, usage };
};

export const createPlanLimitService = ({ subscriptionRepository: subRepo, fieldRepository: fieldRepo, inspectionRepository: inspectionRepo, userRepository: userRepo }) => {
  const getEffectivePlanId = async (organizationId) => {
    const subscription = await subRepo.getByOrganization(organizationId);
    if (!subscription || subscription.status !== 'active') return 'free';
    return subscription.planId;
  };

  const getUsage = async (organizationId, resource) => {
    switch (resource) {
      case 'fields':
        return fieldRepo.count({ organizationId, status: { not: 'archived' } });
      case 'inspections':
        return inspectionRepo.count({ organizationId });
      case 'users':
        return userRepo.count({ organizationId, isActive: true });
      default:
        return 0;
    }
  };

  const assertWithinLimits = async (organizationId, resource) => {
    const planId = await getEffectivePlanId(organizationId);
    const plan = getPlan(planId);
    const limit = plan[resource];

    if (limit === undefined || !Number.isFinite(limit)) return { ok: true, planId, limit, usage: 0 };

    const usage = await getUsage(organizationId, resource);
    const { ok } = checkLimit(planId, resource, usage);
    if (!ok) {
      throw new AppError(409, 'Upgrade required', {
        code: 'PLAN_LIMIT_EXCEEDED',
        data: { planId, limit, usage },
      });
    }
    return { ok: true, planId, limit, usage };
  };

  return { getEffectivePlanId, getUsage, assertWithinLimits, checkLimit };
};

export default createPlanLimitService;