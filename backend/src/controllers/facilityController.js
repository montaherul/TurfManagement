import { successResponse } from '../utils/asyncHandler.js';

export const createFacilityController = ({ facilityService }) => {
  const searchPublic = async (req, res) => {
    const result = await facilityService.searchPublic({
      search: req.query.search,
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit,
    });
    return successResponse(res, result, 'Facilities retrieved');
  };

  const getPublic = async (req, res) => {
    const facility = await facilityService.getPublicBySlug(req.params.slug);
    return successResponse(res, { facility }, 'Facility retrieved');
  };

  const getMine = async (req, res) => {
    const facility = await facilityService.getMine(req.facilityId);
    return successResponse(res, { facility }, 'Facility retrieved');
  };

  const updateProfile = async (req, res) => {
    const facility = await facilityService.updateProfile(req.facilityId, {
      ...req.body,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { facility }, 'Facility updated');
  };

  const listAll = async (req, res) => {
    const result = await facilityService.listAll({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Facilities retrieved');
  };

  const getById = async (req, res) => {
    const facility = await facilityService.getById(req.params.id);
    return successResponse(res, { facility }, 'Facility retrieved');
  };

  const approve = async (req, res) => {
    const result = await facilityService.approveApplication({
      facilityId: req.params.id,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, result, 'Application approved');
  };

  const reject = async (req, res) => {
    const facility = await facilityService.rejectApplication({
      facilityId: req.params.id,
      reason: req.body.reason,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { facility }, 'Application rejected');
  };

  const setStatus = async (req, res) => {
    const facility = await facilityService.setStatus({
      facilityId: req.params.id,
      status: req.body.status,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { facility }, 'Facility status updated');
  };

  return { searchPublic, getPublic, getMine, updateProfile, listAll, getById, approve, reject, setStatus };
};

export default createFacilityController;