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
};

export default settingsService;