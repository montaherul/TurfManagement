import api from '../utils/api';

export const facilityService = {
  searchPublic: async ({ search, type, page = 1, limit = 12 } = {}) => {
    const response = await api.get('/facilities', { params: { search, type, page, limit } });
    return response.data;
  },

  getPublicBySlug: async (slug) => {
    const response = await api.get(`/facilities/by-slug/${slug}`);
    return response.data;
  },

  getMine: async () => {
    const response = await api.get('/facilities/mine');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/facilities/mine/profile', data);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/facilities/${id}`);
    return response.data;
  },
};

export default facilityService;