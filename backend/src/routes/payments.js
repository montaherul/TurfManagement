import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listPaymentsSchema,
  paymentActionSchema,
} from '../validators/paymentValidator.js';
import { services } from '../config/container.js';
import { createPaymentController } from '../controllers/paymentController.js';

const router = express.Router();
const paymentController = createPaymentController({ paymentService: services.payments });

router.get('/', authMiddleware, tenantMiddleware, permit('payment.view'), validate(listPaymentsSchema), asyncHandler(paymentController.list));
router.get('/pending', authMiddleware, tenantMiddleware, permit('payment.view'), asyncHandler(paymentController.pending));
router.get('/wallet', authMiddleware, tenantMiddleware, permit('payment.view'), asyncHandler(paymentController.wallet));
router.post('/:id/verify', authMiddleware, tenantMiddleware, permit('payment.verify'), validate(paymentActionSchema), asyncHandler(paymentController.verify));
router.post('/:id/reject', authMiddleware, tenantMiddleware, permit('payment.verify'), validate(paymentActionSchema), asyncHandler(paymentController.reject));

export default router;