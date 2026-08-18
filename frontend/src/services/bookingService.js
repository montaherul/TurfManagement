import api from '../utils/api';

export const bookingService = {
  create: async (data) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  listMine: async ({ status, page = 1, limit = 20 } = {}) => {
    const response = await api.get('/bookings/mine', { params: { status, page, limit } });
    return response.data;
  },

  listForFacility: async ({ status, date, search, page = 1, limit = 20, sort } = {}) => {
    const response = await api.get('/bookings', { params: { status, date, search, page, limit, sort } });
    return response.data;
  },

  today: async (date) => {
    const response = await api.get('/bookings/today', { params: { date } });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  cancel: async (id, reason) => {
    const response = await api.post(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  checkIn: async (id) => {
    const response = await api.post(`/bookings/${id}/check-in`);
    return response.data;
  },

  complete: async (id) => {
    const response = await api.post(`/bookings/${id}/complete`);
    return response.data;
  },

  markNoShow: async (id) => {
    const response = await api.post(`/bookings/${id}/no-show`);
    return response.data;
  },
};

export default bookingService;