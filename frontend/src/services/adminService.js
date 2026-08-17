import api from '../utils/api';

export const adminService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createUser: async (data) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  getFields: async (params = {}) => {
    const response = await api.get('/admin/fields', { params });
    return response.data;
  },

  getHealth: async () => {
    const response = await api.get('/admin/health');
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};