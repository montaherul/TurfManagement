import api from '../utils/api';

export const reportService = {
  getAnalytics: async () => {
    const response = await api.get('/reports/analytics');
    return response.data;
  },

  getScoreTrends: async (fieldId) => {
    const response = await api.get('/reports/score-trends', {
      params: fieldId ? { fieldId } : {},
    });
    return response.data;
  },

  getScoreDistribution: async () => {
    const response = await api.get('/reports/score-distribution');
    return response.data;
  },

  getWorkOrderStatus: async () => {
    const response = await api.get('/reports/workorder-status');
    return response.data;
  },

  getMaintenanceCosts: async () => {
    const response = await api.get('/reports/maintenance-costs');
    return response.data;
  },

  getCostByField: async () => {
    const response = await api.get('/reports/cost-by-field');
    return response.data;
  },
};