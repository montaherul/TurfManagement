import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listResourcesSchema,
  getResourceSchema,
  createResourceSchema,
  updateResourceSchema,
} from '../validators/resourceValidator.js';
import { services } from '../config/container.js';
import { createResourceController } from '../controllers/resourceController.js';

const router = express.Router();
const resourceController = createResourceController({ resourceService: services.resources });

router.get('/', authMiddleware, tenantMiddleware, permit('resource.view'), validate(listResourcesSchema), asyncHandler(resourceController.list));
router.get('/all', authMiddleware, tenantMiddleware, permit('resource.view'), asyncHandler(resourceController.listAll));
router.get('/:id', authMiddleware, tenantMiddleware, permit('resource.view'), validate(getResourceSchema), asyncHandler(resourceController.get));
router.post('/', authMiddleware, tenantMiddleware, permit('resource.create'), validate(createResourceSchema), asyncHandler(resourceController.create));
router.put('/:id', authMiddleware, tenantMiddleware, permit('resource.update'), validate(getResourceSchema), validate(updateResourceSchema), asyncHandler(resourceController.update));
router.delete('/:id', authMiddleware, tenantMiddleware, permit('resource.delete'), validate(getResourceSchema), asyncHandler(resourceController.remove));

export default router;