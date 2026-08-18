import api from '../utils/api';

export const paymentService = {
  list: async ({ status, method, search, page = 1, limit = 20, sort } = {}) => {
    const response = await api.get('/payments', { params: { status, method, search, page, limit, sort } });
    return response.data;
  },

  pending: async () => {
    const response = await api.get('/payments/pending');
    return response.data;
  },

  wallet: async () => {
    const response = await api.get('/payments/wallet');
    return response.data;
  },

  verify: async (id) => {
    const response = await api.post(`/payments/${id}/verify`);
    return response.data;
  },

  reject: async (id, reason) => {
    const response = await api.post(`/payments/${id}/reject`, { reason });
    return response.data;
  },
};

export default paymentService;