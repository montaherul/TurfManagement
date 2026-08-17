import express from 'express';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { services } from '../config/container.js';
import { createPermissionController } from '../controllers/permissionController.js';

const router = express.Router();
const permissionController = createPermissionController({ permissionService: services.permissions });

router.get('/catalog', asyncHandler(permissionController.getCatalog));
router.get('/my', asyncHandler(permissionController.getMyPermissions));
router.get('/roles', permit('user.manage_permissions'), asyncHandler(permissionController.getRolePermissions));
router.put('/roles/:role', permit('user.manage_permissions'), asyncHandler(permissionController.updateRolePermissions));
router.get('/users', permit('user.list'), asyncHandler(permissionController.getUsers));
router.put('/users/:id', permit('user.update'), asyncHandler(permissionController.updateUserRole));
router.delete('/users/:id', permit('user.delete'), asyncHandler(permissionController.removeUser));
router.get('/users/:id/permissions', permit('user.manage_permissions'), asyncHandler(permissionController.getUserPermissions));
router.put('/users/:id/permissions', permit('user.manage_permissions'), asyncHandler(permissionController.updateUserPermissions));

export default router;