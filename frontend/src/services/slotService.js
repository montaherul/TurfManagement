import api from '../utils/api';

export const slotService = {
  availability: async ({ resourceId, date }) => {
    const response = await api.get('/slots/availability', { params: { resourceId, date } });
    return response.data;
  },

  listForFacility: async ({ date, resourceId } = {}) => {
    const response = await api.get('/slots', { params: { date, resourceId } });
    return response.data;
  },

  generate: async (date) => {
    const response = await api.post('/slots/generate', { date });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/slots/${id}/status`, { status });
    return response.data;
  },
};

export default slotService;