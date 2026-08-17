import express from 'express';
import { validate } from '../middleware/validate.js';
import { enforcePlanLimit } from '../middleware/planLimits.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createFieldSchema,
  updateFieldSchema,
  listFieldsSchema,
  getFieldSchema,
  nearbyFieldsSchema,
} from '../validators/fieldValidator.js';
import { services } from '../config/container.js';
import { createFieldController } from '../controllers/fieldController.js';

const router = express.Router();
const fieldController = createFieldController({ fieldService: services.fields });

router.get('/', validate(listFieldsSchema), asyncHandler(fieldController.getFields));
router.get('/nearby', validate(nearbyFieldsSchema), asyncHandler(fieldController.getNearbyFields));
router.get('/:id', validate(getFieldSchema), asyncHandler(fieldController.getField));
router.post('/', permit('field.create'), enforcePlanLimit('fields'), validate(createFieldSchema), asyncHandler(fieldController.createField));
router.put('/:id', permit('field.update'), validate(getFieldSchema), validate(updateFieldSchema), asyncHandler(fieldController.updateField));
router.delete('/:id', permit('field.delete'), validate(getFieldSchema), asyncHandler(fieldController.deleteField));

export default router;