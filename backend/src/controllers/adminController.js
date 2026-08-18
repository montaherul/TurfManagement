import { successResponse } from '../utils/asyncHandler.js';

export const createAdminController = ({ adminService }) => {
  const listFacilities = async (req, res) => {
    const result = await adminService.listFacilities({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Facilities retrieved');
  };

  const getFacility = async (req, res) => {
    const facility = await adminService.getFacility(req.params.id);
    return successResponse(res, { facility }, 'Facility retrieved');
  };

  const approve = async (req, res) => {
    const result = await adminService.approveApplication({
      facilityId: req.params.id,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, result, 'Application approved');
  };

  const reject = async (req, res) => {
    const facility = await adminService.rejectApplication({
      facilityId: req.params.id,
      reason: req.body.reason,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { facility }, 'Application rejected');
  };

  const setFacilityStatus = async (req, res) => {
    const facility = await adminService.setFacilityStatus({
      facilityId: req.params.id,
      status: req.body.status,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { facility }, 'Facility status updated');
  };

  const listCustomers = async (req, res) => {
    const result = await adminService.listCustomers({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Customers retrieved');
  };

  const feeSummary = async (req, res) => {
    const summary = await adminService.feeSummary();
    return successResponse(res, { fees: summary }, 'Fee summary');
  };

  const getSettings = async (req, res) => {
    const settings = await adminService.getSettings();
    return successResponse(res, { settings }, 'Platform settings');
  };

  const setSettings = async (req, res) => {
    const updated = await adminService.setSettings({
      settings: req.body,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { settings: updated }, 'Platform settings updated');
  };

  return {
    listFacilities,
    getFacility,
    approve,
    reject,
    setFacilityStatus,
    listCustomers,
    feeSummary,
    getSettings,
    setSettings,
  };
};

export default createAdminController;