import api from '../utils/api';

export const blacklistService = {
  list: async ({ search, category, page = 1, limit = 20, sort } = {}) => {
    const response = await api.get('/blacklist', { params: { search, category, page, limit, sort } });
    return response.data;
  },

  listAll: async () => {
    const response = await api.get('/blacklist/all');
    return response.data;
  },

  findCustomer: async (mobile) => {
    const response = await api.get('/blacklist/customers/search', { params: { mobile } });
    return response.data;
  },

  add: async (data) => {
    const response = await api.post('/blacklist', data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/blacklist/${id}`);
    return response.data;
  },
};

export default blacklistService;