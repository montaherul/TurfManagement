import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listFacilitiesSchema,
  getFacilityBySlugSchema,
  getFacilityByIdSchema,
  updateFacilityProfileSchema,
} from '../validators/facilityValidator.js';
import { services } from '../config/container.js';
import { createFacilityController } from '../controllers/facilityController.js';

const router = express.Router();
const facilityController = createFacilityController({ facilityService: services.facilities });

// Public: search + public facility page
router.get('/', validate(listFacilitiesSchema), asyncHandler(facilityController.searchPublic));
router.get('/by-slug/:slug', validate(getFacilityBySlugSchema), asyncHandler(facilityController.getPublic));
router.get('/mine', authMiddleware, tenantMiddleware, permit('facility.manage'), asyncHandler(facilityController.getMine));
router.put('/mine/profile', authMiddleware, tenantMiddleware, permit('facility.manage'), validate(updateFacilityProfileSchema), asyncHandler(facilityController.updateProfile));
router.get('/:id', authMiddleware, tenantMiddleware, validate(getFacilityByIdSchema), asyncHandler(facilityController.getById));

export default router;