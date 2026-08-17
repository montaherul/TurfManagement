import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { services } from '../config/container.js';
import { createAuthController } from '../controllers/authController.js';

const router = express.Router();
const authController = createAuthController({ authService: services.auth });

router.post('/register', validate(registerSchema), asyncHandler(authController.register));
router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authMiddleware, asyncHandler(authController.me));

export default router;