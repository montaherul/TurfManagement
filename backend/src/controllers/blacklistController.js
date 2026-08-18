import { successResponse } from '../utils/asyncHandler.js';

export const createBlacklistController = ({ blacklistService, userRepository }) => {
  const list = async (req, res) => {
    const result = await blacklistService.list({
      facilityId: req.facilityId,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      category: req.query.category,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Blacklist retrieved');
  };

  const listAll = async (req, res) => {
    const entries = await blacklistService.listAll(req.facilityId);
    return successResponse(res, { entries, count: entries.length }, 'Blacklist retrieved');
  };

  const add = async (req, res) => {
    const entry = await blacklistService.add({
      facilityId: req.facilityId,
      actorId: req.user.userId,
      data: req.body,
      ipAddress: req.ip,
    });
    return successResponse(res, { entry }, 'Customer blacklisted', 201);
  };

  const remove = async (req, res) => {
    await blacklistService.remove({
      facilityId: req.facilityId,
      id: req.params.id,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, null, 'Blacklist entry removed');
  };

  const findCustomer = async (req, res) => {
    const customer = await userRepository.findByMobilePublic(req.query.mobile);
    if (!customer || customer.role !== 'booker') {
      return successResponse(res, { customer: null }, 'Customer not found');
    }
    return successResponse(res, { customer }, 'Customer found');
  };

  return { list, listAll, add, remove, findCustomer };
};

export default createBlacklistController;