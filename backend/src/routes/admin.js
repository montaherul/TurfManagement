import express from 'express';
import { validate } from '../middleware/validate.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listFacilitiesSchema,
  getFacilityByIdSchema,
  approveFacilitySchema,
  rejectFacilitySchema,
  facilityStatusSchema,
  adminSettingsSchema,
} from '../validators/facilityValidator.js';
import { services } from '../config/container.js';
import { createAdminController } from '../controllers/adminController.js';

const router = express.Router();
const adminController = createAdminController({ adminService: services.admin });

// Platform admin only — no tenant scoping
router.use(authorize('platform_admin'));

router.get('/facilities', validate(listFacilitiesSchema), asyncHandler(adminController.listFacilities));
router.get('/facilities/:id', validate(getFacilityByIdSchema), asyncHandler(adminController.getFacility));
router.post('/facilities/:id/approve', validate(approveFacilitySchema), asyncHandler(adminController.approve));
router.post('/facilities/:id/reject', validate(rejectFacilitySchema), asyncHandler(adminController.reject));
router.post('/facilities/:id/status', validate(facilityStatusSchema), asyncHandler(adminController.setFacilityStatus));
router.get('/customers', validate(listFacilitiesSchema), asyncHandler(adminController.listCustomers));
router.get('/fees', asyncHandler(adminController.feeSummary));
router.get('/settings', asyncHandler(adminController.getSettings));
router.put('/settings', validate(adminSettingsSchema), asyncHandler(adminController.setSettings));

export default router;