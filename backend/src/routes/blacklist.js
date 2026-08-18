import express from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listBlacklistSchema,
  createBlacklistSchema,
  blacklistActionSchema,
  customerByMobileSchema,
} from '../validators/blacklistValidator.js';
import { services, repositories } from '../config/container.js';
import { createBlacklistController } from '../controllers/blacklistController.js';

const router = express.Router();
const blacklistController = createBlacklistController({
  blacklistService: services.blacklist,
  userRepository: repositories.users,
});

router.get('/', authMiddleware, tenantMiddleware, permit('blacklist.view'), validate(listBlacklistSchema), asyncHandler(blacklistController.list));
router.get('/all', authMiddleware, tenantMiddleware, permit('blacklist.view'), asyncHandler(blacklistController.listAll));
router.get('/customers/search', authMiddleware, tenantMiddleware, permit('blacklist.view'), validate(customerByMobileSchema), asyncHandler(blacklistController.findCustomer));
router.post('/', authMiddleware, tenantMiddleware, permit('blacklist.create'), validate(createBlacklistSchema), asyncHandler(blacklistController.add));
router.delete('/:id', authMiddleware, tenantMiddleware, permit('blacklist.delete'), validate(blacklistActionSchema), asyncHandler(blacklistController.remove));

export default router;