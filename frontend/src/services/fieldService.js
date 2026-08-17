import api from '../utils/api';
import { createResourceService } from './createResourceService';

export const fieldService = {
  ...createResourceService('/fields', {
    names: {
      list: 'getFields',
      get: 'getField',
      create: 'createField',
      update: 'updateField',
      remove: 'deleteField',
    },
  }),

  getNearbyFields: async (lat, lng, radius = 10) => {
    const response = await api.get('/fields/nearby', {
      params: { lat, lng, radius },
    });
    return response.data;
  },
};

export default fieldService;