import express from 'express';
import { validate } from '../middleware/validate.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  listWorkOrdersSchema,
  getWorkOrderSchema,
} from '../validators/workOrderValidator.js';
import { services } from '../config/container.js';
import { createWorkOrderController } from '../controllers/workOrderController.js';

const router = express.Router();
const workOrderController = createWorkOrderController({ workOrderService: services.workOrders });

router.get('/', validate(listWorkOrdersSchema), asyncHandler(workOrderController.getWorkOrders));
router.get('/:id', validate(getWorkOrderSchema), asyncHandler(workOrderController.getWorkOrder));
router.post('/', permit('workorder.create'), validate(createWorkOrderSchema), asyncHandler(workOrderController.createWorkOrder));
router.put('/:id', permit('workorder.update'), validate(getWorkOrderSchema), validate(updateWorkOrderSchema), asyncHandler(workOrderController.updateWorkOrder));
router.delete('/:id', permit('workorder.delete'), validate(getWorkOrderSchema), asyncHandler(workOrderController.deleteWorkOrder));

export default router;