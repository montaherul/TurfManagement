import { tenantContext } from '../config/db.js';
import { AppError } from '../utils/ApiError.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const ORG_CACHE_TTL = 60;

export const tenantMiddleware = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      if (req.user?.role === 'super_admin') {
        req.tenant = null;
        return tenantContext.run({ organizationId: null }, () => next());
      }
      return res.status(403).json({
        success: false,
        message: 'Organization context required',
        code: 'ORG_CONTEXT_REQUIRED',
      });
    }

    let org = await cacheGet(`tenant:org:${organizationId}`);
    if (!org) {
      org = await organizationRepository.findById(organizationId);
      if (org) await cacheSet(`tenant:org:${organizationId}`, org, ORG_CACHE_TTL);
    }

    if (!org) {
      return res.status(403).json({
        success: false,
        message: 'Organization not found or access denied',
        code: 'ORG_NOT_FOUND',
      });
    }

    if (org.settings?.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Organization has been suspended',
        code: 'ORG_SUSPENDED',
      });
    }

    req.tenant = org;
    req.organizationId = organizationId;

    tenantContext.run({ organizationId }, () => next());
  } catch (error) {
    next(new AppError(403, 'Organization context required', { code: 'ORG_CONTEXT_REQUIRED', data: null }));
  }
};