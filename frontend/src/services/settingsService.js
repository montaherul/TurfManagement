import api from '../utils/api';

export const settingsService = {
  getOrganizationSettings: async () => {
    const response = await api.get('/organizations/me/settings');
    return response.data;
  },

  updateOrganizationSettings: async (settings) => {
    const response = await api.put('/organizations/me/settings', settings);
    return response.data;
  },

  listReportSchedules: async () => {
    const response = await api.get('/reports/schedules');
    return response.data;
  },

  createReportSchedule: async (schedule) => {
    const response = await api.post('/reports/schedules', schedule);
    return response.data;
  },

  updateReportSchedule: async (id, schedule) => {
    const response = await api.put(`/reports/schedules/${id}`, schedule);
    return response.data;
  },

  deleteReportSchedule: async (id) => {
    const response = await api.delete(`/reports/schedules/${id}`);
    return response.data;
  },
};

export default settingsService;