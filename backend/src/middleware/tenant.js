import { tenantContext } from '../config/db.js';
import { AppError } from '../utils/ApiError.js';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const FACILITY_CACHE_TTL = 60;

/**
 * Resolves the facility tenant from the JWT, verifies it exists and is
 * operational, and runs the handler inside tenantContext so every Prisma
 * query is auto-scoped to the facility (defense in depth).
 * platform_admin requests without a facilityId bypass scoping.
 */
export const tenantMiddleware = async (req, res, next) => {
  try {
    const facilityId = req.facilityId;

    if (!facilityId) {
      if (req.user?.role === 'platform_admin' || req.user?.role === 'booker') {
        req.tenant = null;
        return tenantContext.run({ facilityId: null }, () => next());
      }
      return res.status(403).json({
        success: false,
        message: 'Facility context required',
        code: 'FACILITY_CONTEXT_REQUIRED',
      });
    }

    let facility = await cacheGet(`tenant:facility:${facilityId}`);
    if (!facility) {
      facility = await facilityRepository.findById(facilityId);
      if (facility) await cacheSet(`tenant:facility:${facilityId}`, facility, FACILITY_CACHE_TTL);
    }

    if (!facility) {
      return res.status(403).json({
        success: false,
        message: 'Facility not found or access denied',
        code: 'FACILITY_NOT_FOUND',
      });
    }

    if (facility.status === 'SUSPENDED' || facility.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        message: 'Facility is not operational',
        code: 'FACILITY_SUSPENDED',
      });
    }

    req.tenant = facility;
    req.facilityId = facilityId;

    tenantContext.run({ facilityId }, () => next());
  } catch (error) {
    next(new AppError(403, 'Facility context required', { code: 'FACILITY_CONTEXT_REQUIRED' }));
  }
};

export default tenantMiddleware;