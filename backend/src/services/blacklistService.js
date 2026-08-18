import { AppError } from '../utils/ApiError.js';

export const BLACKLIST_CATEGORIES = [
  'REPEATED_NO_SHOW', 'PAYMENT_FRAUD', 'MISCONDUCT', 'PROPERTY_DAMAGE', 'VERBAL_ABUSE',
];

export const createBlacklistService = ({
  blacklistRepository,
  blacklistListRepository,
  userRepository,
  auditLogRepository,
}) => {
  const list = async ({ facilityId, page, limit, search, category, sort }) => {
    const result = await blacklistListRepository.list({
      facilityId,
      page,
      limit,
      search,
      sort,
      filters: { category },
    });
    return result;
  };

  const listAll = (facilityId) => blacklistRepository.listForFacility(facilityId);

  const add = async ({ facilityId, actorId, data, ipAddress }) => {
    const { customerId, teamName, category, reason } = data;
    if (!BLACKLIST_CATEGORIES.includes(category)) {
      throw new AppError(422, `Invalid category: ${category}`, { code: 'VALIDATION_ERROR' });
    }
    if (!customerId && !teamName) {
      throw new AppError(422, 'customerId or teamName is required', { code: 'VALIDATION_ERROR' });
    }
    if (customerId) {
      const customer = await userRepository.findById(customerId);
      if (!customer || customer.role !== 'booker') {
        throw new AppError(404, 'Customer not found', { code: 'NOT_FOUND' });
      }
      const existing = await blacklistRepository.findForCustomer(facilityId, customerId);
      if (existing) {
        throw new AppError(409, 'Customer is already blacklisted', { code: 'ALREADY_BLACKLISTED' });
      }
    }
    const entry = await blacklistRepository.create({
      facilityId,
      customerId: customerId || null,
      teamName: teamName || null,
      category,
      reason: reason || null,
      addedBy: actorId,
    });
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'blacklist.create',
      resource: 'blacklist',
      resourceId: entry.id,
      details: { category, customerId, teamName },
      ipAddress: ipAddress || null,
    });
    return entry;
  };

  const remove = async ({ facilityId, id, actorId, ipAddress }) => {
    const entry = await blacklistRepository.findFirst({ id, facilityId });
    if (!entry) {
      throw new AppError(404, 'Blacklist entry not found', { code: 'NOT_FOUND' });
    }
    await blacklistRepository.delete(id);
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'blacklist.delete',
      resource: 'blacklist',
      resourceId: id,
      ipAddress: ipAddress || null,
    });
    return { id };
  };

  return { list, listAll, add, remove };
};

export default createBlacklistService;