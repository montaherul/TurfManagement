import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listAvailabilitySchema,
  generateSlotsSchema,
  listSlotsSchema,
  updateSlotSchema,
} from '../validators/slotValidator.js';
import { services } from '../config/container.js';
import { createSlotController } from '../controllers/slotController.js';

const router = express.Router();
const slotController = createSlotController({ slotService: services.slots });

// Public availability (customer booking flow) — optional auth so bookers can browse
router.get('/availability', optionalAuth, validate(listAvailabilitySchema), asyncHandler(slotController.listAvailability));
router.get('/', authMiddleware, tenantMiddleware, permit('slot.view'), validate(listSlotsSchema), asyncHandler(slotController.listForFacility));
router.post('/generate', authMiddleware, tenantMiddleware, permit('slot.generate'), validate(generateSlotsSchema), asyncHandler(slotController.generate));
router.patch('/:id/status', authMiddleware, tenantMiddleware, permit('slot.update'), validate(updateSlotSchema), asyncHandler(slotController.updateStatus));

export default router;