import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotificationController } from '../controllers/notificationController.js';

const router = express.Router();
const notificationController = createNotificationController();

router.get('/', asyncHandler(notificationController.list));
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.put('/read-all', asyncHandler(notificationController.markAllRead));
router.delete('/read', asyncHandler(notificationController.clearRead));
router.put('/:id/read', asyncHandler(notificationController.markRead));

export default router;