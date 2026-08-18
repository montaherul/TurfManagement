import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  loginSchema,
  applyForFacilitySchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
} from '../validators/authValidator.js';
import { services } from '../config/container.js';
import { createAuthController } from '../controllers/authController.js';

const router = express.Router();
const authController = createAuthController({ authService: services.auth });

router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/apply', validate(applyForFacilitySchema), asyncHandler(authController.applyForFacility));
router.post('/otp/request', validate(requestOtpSchema), asyncHandler(authController.requestOtp));
router.post('/otp/verify', validate(verifyOtpSchema), asyncHandler(authController.verifyOtp));
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authMiddleware, asyncHandler(authController.me));

export default router;