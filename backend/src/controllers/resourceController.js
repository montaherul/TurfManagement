import { successResponse } from '../utils/asyncHandler.js';

export const createResourceController = ({ resourceService }) => {
  const list = async (req, res) => {
    const result = await resourceService.list({
      facilityId: req.facilityId,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      type: req.query.type,
      status: req.query.status,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Resources retrieved');
  };

  const listAll = async (req, res) => {
    const resources = await resourceService.listForFacility(req.facilityId);
    return successResponse(res, { resources }, 'Resources retrieved');
  };

  const get = async (req, res) => {
    const resource = await resourceService.get(req.facilityId, req.params.id);
    return successResponse(res, { resource }, 'Resource retrieved');
  };

  const create = async (req, res) => {
    const resource = await resourceService.create({
      facilityId: req.facilityId,
      actorId: req.user.userId,
      data: { ...req.body, ipAddress: req.ip },
    });
    return successResponse(res, { resource }, 'Resource created', 201);
  };

  const update = async (req, res) => {
    const resource = await resourceService.update({
      facilityId: req.facilityId,
      id: req.params.id,
      actorId: req.user.userId,
      data: { ...req.body, ipAddress: req.ip },
    });
    return successResponse(res, { resource }, 'Resource updated');
  };

  const remove = async (req, res) => {
    await resourceService.remove({
      facilityId: req.facilityId,
      id: req.params.id,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, null, 'Resource deleted');
  };

  return { list, listAll, get, create, update, remove };
};

export default createResourceController;