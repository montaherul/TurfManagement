import { successResponse } from '../utils/asyncHandler.js';
import { services } from '../config/container.js';

export const createNotificationController = () => {
  const notificationService = services.notification;

  const list = async (req, res) => {
    const { page, limit } = req.query;
    const result = await notificationService.listForUser({
      userId: req.user.userId,
      page,
      limit,
    });
    return successResponse(res, result);
  };

  const unreadCount = async (req, res) => {
    const count = await notificationService.unreadCount(req.user.userId);
    return successResponse(res, { count });
  };

  const markRead = async (req, res) => {
    const { id } = req.params;
    const marked = await notificationService.markRead(id, req.user.userId);
    if (!marked) {
      return successResponse(res, { marked: false }, 'Notification not found');
    }
    return successResponse(res, { marked: true }, 'Notification marked as read');
  };

  const markAllRead = async (req, res) => {
    await notificationService.markAllRead(req.user.userId);
    return successResponse(res, { marked: true }, 'All notifications marked as read');
  };

  const clearRead = async (req, res) => {
    await notificationService.clearRead(req.user.userId);
    return successResponse(res, { cleared: true }, 'Read notifications cleared');
  };

  return { list, unreadCount, markRead, markAllRead, clearRead };
};

export default createNotificationController;