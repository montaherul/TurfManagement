import api from '../utils/api';

export const resourceService = {
  list: async ({ page = 1, limit = 10, search, type, status, sort } = {}) => {
    const response = await api.get('/resources', { params: { page, limit, search, type, status, sort } });
    return response.data;
  },

  listAll: async () => {
    const response = await api.get('/resources/all');
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/resources/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/resources', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/resources/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/resources/${id}`);
    return response.data;
  },
};

export default resourceService;