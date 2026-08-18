import api from '../utils/api';

export const adminService = {
  listFacilities: async ({ search, status, page = 1, limit = 20 } = {}) => {
    const response = await api.get('/admin/facilities', { params: { search, status, page, limit } });
    return response.data;
  },

  getFacility: async (id) => {
    const response = await api.get(`/admin/facilities/${id}`);
    return response.data;
  },

  approve: async (id) => {
    const response = await api.post(`/admin/facilities/${id}/approve`);
    return response.data;
  },

  reject: async (id, reason) => {
    const response = await api.post(`/admin/facilities/${id}/reject`, { reason });
    return response.data;
  },

  setStatus: async (id, status) => {
    const response = await api.post(`/admin/facilities/${id}/status`, { status });
    return response.data;
  },

  listCustomers: async ({ search, page = 1, limit = 20 } = {}) => {
    const response = await api.get('/admin/customers', { params: { search, page, limit } });
    return response.data;
  },

  feeSummary: async () => {
    const response = await api.get('/admin/fees');
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  setSettings: async (settings) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },
};

export default adminService;