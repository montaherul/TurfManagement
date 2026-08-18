import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createBookingSchema,
  listBookingsSchema,
  myBookingsSchema,
  getBookingSchema,
  cancelBookingSchema,
  todayBookingsSchema,
} from '../validators/bookingValidator.js';
import { services } from '../config/container.js';
import { createBookingController } from '../controllers/bookingController.js';

const router = express.Router();
const bookingController = createBookingController({ bookingService: services.bookings });

// Customer routes (booker): create own bookings, list own bookings
router.post('/', authMiddleware, tenantMiddleware, permit('booking.create'), validate(createBookingSchema), asyncHandler(bookingController.create));
router.get('/mine', authMiddleware, tenantMiddleware, permit('booking.view'), validate(myBookingsSchema), asyncHandler(bookingController.listMine));

// Facility routes (owner/manager/operator)
router.get('/', authMiddleware, tenantMiddleware, permit('booking.view'), validate(listBookingsSchema), asyncHandler(bookingController.listForFacility));
router.get('/today', authMiddleware, tenantMiddleware, permit('booking.view'), validate(todayBookingsSchema), asyncHandler(bookingController.today));
router.post('/:id/cancel', authMiddleware, tenantMiddleware, permit('booking.cancel'), validate(getBookingSchema), validate(cancelBookingSchema), asyncHandler(bookingController.cancel));
router.post('/:id/check-in', authMiddleware, tenantMiddleware, permit('booking.update'), validate(getBookingSchema), asyncHandler(bookingController.checkIn));
router.post('/:id/complete', authMiddleware, tenantMiddleware, permit('booking.update'), validate(getBookingSchema), asyncHandler(bookingController.complete));
router.post('/:id/no-show', authMiddleware, tenantMiddleware, permit('booking.update'), validate(getBookingSchema), asyncHandler(bookingController.markNoShow));
router.get('/:id', authMiddleware, tenantMiddleware, permit('booking.view'), validate(getBookingSchema), asyncHandler(bookingController.get));

export default router;