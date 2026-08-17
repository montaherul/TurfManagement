import express from 'express';
import { validate } from '../middleware/validate.js';
import { enforcePlanLimit } from '../middleware/planLimits.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createInspectionSchema,
  updateInspectionSchema,
  listInspectionsSchema,
  getInspectionSchema,
} from '../validators/inspectionValidator.js';
import { services } from '../config/container.js';
import { createInspectionController } from '../controllers/inspectionController.js';

const router = express.Router();
const inspectionController = createInspectionController({ inspectionService: services.inspections });

router.get('/', validate(listInspectionsSchema), asyncHandler(inspectionController.getInspections));
router.get('/:id', validate(getInspectionSchema), asyncHandler(inspectionController.getInspection));
router.post(
  '/',
  permit('inspection.create'),
  enforcePlanLimit('inspections'),
  validate(createInspectionSchema),
  asyncHandler(inspectionController.createInspection)
);
router.put('/:id', permit('inspection.update'), validate(getInspectionSchema), validate(updateInspectionSchema), asyncHandler(inspectionController.updateInspection));
router.delete('/:id', permit('inspection.delete'), validate(getInspectionSchema), asyncHandler(inspectionController.deleteInspection));
router.post('/:id/submit', permit('inspection.update'), validate(getInspectionSchema), asyncHandler(inspectionController.submitInspection));
router.post('/:id/verify', permit('inspection.verify'), validate(getInspectionSchema), asyncHandler(inspectionController.verifyInspection));
router.get('/:id/pdf', validate(getInspectionSchema), asyncHandler(inspectionController.generatePDF));

export default router;