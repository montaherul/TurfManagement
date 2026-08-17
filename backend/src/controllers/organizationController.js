import { successResponse } from '../utils/asyncHandler.js';

export const createOrganizationController = ({ adminService }) => {
  const getOrganizations = async (req, res) => {
    const result = await adminService.listOrganizations({
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      search: req.query.search,
      filters: req.query,
    });
    return res.json({ success: true, message: 'Organizations retrieved successfully', ...result });
  };

  const getOrganization = async (req, res) => {
    const organization = await adminService.getOrganization(req.params.id);
    return successResponse(res, { organization });
  };

  const updateOrganization = async (req, res) => {
    const organization = await adminService.updateOrganization(req.params.id, req.body);
    return successResponse(res, { organization }, 'Organization updated');
  };

  const suspendOrganization = async (req, res) => {
    const organization = await adminService.suspendOrganization(req.params.id, {
      suspended: req.body.suspended !== false,
    });
    return successResponse(
      res,
      { organization },
      organization.settings?.suspended ? 'Organization suspended successfully' : 'Organization reactivated'
    );
  };

  const getSettings = async (req, res) => {
    const organization = await adminService.getOrganization(req.organizationId);
    return successResponse(res, { settings: organization?.settings || {} });
  };

  const updateSettings = async (req, res) => {
    const organization = await adminService.getOrganization(req.organizationId);
    const current = organization?.settings || {};
    const merged = {
      ...current,
      ...req.body,
      scoringWeights: req.body.scoringWeights ?? current.scoringWeights,
    };
    const updated = await adminService.updateOrganization(req.organizationId, { settings: merged });
    return successResponse(res, { settings: updated.settings }, 'Settings updated');
  };

  return { getOrganizations, getOrganization, updateOrganization, suspendOrganization, getSettings, updateSettings };
};

export default createOrganizationController;