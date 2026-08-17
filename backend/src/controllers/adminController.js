import { successResponse } from '../utils/asyncHandler.js';

export const createAdminController = ({ adminService }) => {
  const getSystemHealth = async (req, res) => {
    const health = await adminService.getSystemHealth();
    return successResponse(res, health);
  };

  const getAllUsers = async (req, res) => {
    const result = await adminService.listUsers({
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      search: req.query.search,
      filters: req.query,
    });
    return res.json({ success: true, message: 'Users retrieved successfully', ...result });
  };

  const createUser = async (req, res) => {
    const user = await adminService.createUser({
      actorRole: req.user.role,
      actorOrganizationId: req.organizationId,
      data: { ...req.body, actorId: req.user.userId },
      ipAddress: req.ip,
    });
    return successResponse(res, { user }, 'User created successfully', 201);
  };

  const getAllFields = async (req, res) => {
    const result = await adminService.listFields({
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      search: req.query.search,
      filters: req.query,
    });
    return res.json({ success: true, message: 'Fields retrieved successfully', ...result });
  };

  const getAuditLogs = async (req, res) => {
    const result = await adminService.listAuditLogs({
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      search: req.query.search,
      filters: req.query,
    });
    return res.json({ success: true, message: 'Audit logs retrieved successfully', ...result });
  };

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

  return { getSystemHealth, getAllUsers, createUser, getAllFields, getAuditLogs, getOrganizations };
};

export default createAdminController;