import { services } from '../config/container.js';

/**
 * Enforces plan usage limits before a create operation.
 * Usage: router.post('/', enforcePlanLimit('field'), createField)
 */
export const enforcePlanLimit = (resource) => async (req, res, next) => {
  try {
    await services.planLimit.assertWithinLimits(req.organizationId, resource);
    next();
  } catch (err) {
    next(err);
  }
};