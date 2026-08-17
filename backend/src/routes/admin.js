import express from 'express';
import { validate } from '../middleware/validate.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createAdminUserSchema,
  listAdminUsersSchema,
  listAdminFieldsSchema,
  listAuditLogsSchema,
  listOrganizationsSchema,
} from '../validators/adminValidator.js';
import { services } from '../config/container.js';
import { createAdminController } from '../controllers/adminController.js';
import { createPermissionController } from '../controllers/permissionController.js';

const router = express.Router();
const adminController = createAdminController({ adminService: services.admin });
const permissionController = createPermissionController({ permissionService: services.permissions });

router.get('/health', authorize('super_admin', 'org_admin'), asyncHandler(adminController.getSystemHealth));
router.get('/users', authorize('super_admin'), validate(listAdminUsersSchema), asyncHandler(adminController.getAllUsers));
router.post('/users', authorize('super_admin', 'org_admin'), validate(createAdminUserSchema), asyncHandler(adminController.createUser));
router.get('/fields', authorize('super_admin'), validate(listAdminFieldsSchema), asyncHandler(adminController.getAllFields));
router.get('/organizations', authorize('super_admin'), validate(listOrganizationsSchema), asyncHandler(adminController.getOrganizations));
router.get('/audit-logs', authorize('super_admin'), validate(listAuditLogsSchema), asyncHandler(adminController.getAuditLogs));

router.get('/permissions/catalog', authorize('super_admin'), asyncHandler(permissionController.getCatalog));
router.get('/permissions/roles', authorize('super_admin'), asyncHandler(permissionController.getRolePermissions));
router.put('/permissions/roles/:role', authorize('super_admin'), asyncHandler(permissionController.updateRolePermissions));
router.get('/permissions/users/:id', authorize('super_admin'), asyncHandler(permissionController.getUserPermissions));
router.put('/permissions/users/:id', authorize('super_admin'), asyncHandler(permissionController.updateUserPermissions));
router.put('/users/:id', authorize('super_admin'), asyncHandler(permissionController.updateUserRole));
router.get('/permissions/organizations/:orgId/roles', authorize('super_admin'), (req, _res, next) => {
  req.organizationId = req.params.orgId;
  next();
}, asyncHandler(permissionController.getRolePermissions));
router.put('/permissions/organizations/:orgId/roles/:role', authorize('super_admin'), (req, _res, next) => {
  req.organizationId = req.params.orgId;
  next();
}, asyncHandler(permissionController.updateRolePermissions));

export default router;