import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/ApiError.js';

export const createPermissionController = ({ permissionService }) => {
  const getCatalog = asyncHandler(async (req, res) => {
    const data = permissionService.getCatalog();
    res.json({ success: true, data });
  });

  const getMyPermissions = asyncHandler(async (req, res) => {
    const data = await permissionService.getMyPermissions(req.user);
    res.json({ success: true, data });
  });

  const getRolePermissions = asyncHandler(async (req, res) => {
    const data = await permissionService.listRolePermissions({
      organizationId: req.organizationId || null,
    });
    res.json({ success: true, data });
  });

  const updateRolePermissions = asyncHandler(async (req, res) => {
    const data = await permissionService.syncRolePermissions({
      role: req.params.role,
      actions: req.body.actions,
      organizationId: req.organizationId || null,
      actorId: req.user.userId,
      organizationIdForAudit: req.organizationId || null,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Role permissions updated', data });
  });

  const getUserPermissions = asyncHandler(async (req, res) => {
    const data = await permissionService.listUserOverrides(req.params.id);
    res.json({ success: true, data });
  });

  const updateUserPermissions = asyncHandler(async (req, res) => {
    const data = await permissionService.syncUserOverrides({
      userId: req.params.id,
      allowed: req.body.allowed,
      denied: req.body.denied,
      actorId: req.user.userId,
      organizationId: req.organizationId || null,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'User permissions updated', data });
  });

  const getUsers = asyncHandler(async (req, res) => {
    const { page, limit, search, role, sort } = req.query;
    const data = await permissionService.listUsers({
      organizationId: req.organizationId,
      page,
      limit,
      search,
      role,
      sort,
    });
    res.json({ success: true, data: data.data, pagination: data.pagination });
  });

  const updateUserRole = asyncHandler(async (req, res) => {
    const { role, isActive } = req.body;
    if (!role && isActive === undefined) {
      throw new AppError(422, 'Nothing to update', { code: 'VALIDATION_ERROR' });
    }
    const data = await permissionService.updateUserRole({
      userId: req.params.id,
      role,
      isActive,
      actorId: req.user.userId,
      organizationId: req.organizationId || null,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'User updated', data });
  });

  const removeUser = asyncHandler(async (req, res) => {
    const data = await permissionService.removeUser({
      userId: req.params.id,
      actorId: req.user.userId,
      organizationId: req.organizationId || null,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'User removed', data });
  });

  return {
    getCatalog,
    getMyPermissions,
    getRolePermissions,
    updateRolePermissions,
    getUserPermissions,
    updateUserPermissions,
    getUsers,
    updateUserRole,
    removeUser,
  };
};

export default createPermissionController;
