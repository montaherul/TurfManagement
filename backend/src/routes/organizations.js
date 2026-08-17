import express from 'express';
import { validate } from '../middleware/validate.js';
import { authorize } from '../middleware/auth.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listOrganizationsSchema,
  updateOrganizationSettingsSchema,
} from '../validators/adminValidator.js';
import { services } from '../config/container.js';
import { createOrganizationController } from '../controllers/organizationController.js';

const router = express.Router();
const organizationController = createOrganizationController({ adminService: services.admin });

router.get(
  '/me/settings',
  permit('settings.manage'),
  asyncHandler(organizationController.getSettings)
);
router.put(
  '/me/settings',
  permit('settings.manage'),
  validate(updateOrganizationSettingsSchema),
  asyncHandler(organizationController.updateSettings)
);
router.get('/', authorize('super_admin'), validate(listOrganizationsSchema), asyncHandler(organizationController.getOrganizations));
router.get('/:id', authorize('super_admin'), asyncHandler(organizationController.getOrganization));
router.put('/:id', authorize('super_admin'), asyncHandler(organizationController.updateOrganization));
router.patch('/:id/suspend', authorize('super_admin'), asyncHandler(organizationController.suspendOrganization));

export default router;