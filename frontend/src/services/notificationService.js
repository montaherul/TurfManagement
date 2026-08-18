import api from '../utils/api';

export const notificationService = {
  list: async ({ page = 1, limit = 20 } = {}) => {
    const response = await api.get('/notifications', { params: { page, limit } });
    return response.data;
  },

  unreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  clearRead: async () => {
    const response = await api.delete('/notifications/read');
    return response.data;
  },
};

export default notificationService;