import api from '../utils/api';
import { createResourceService } from './createResourceService';

export const inspectionService = {
  ...createResourceService('/inspections', {
    names: {
      list: 'getInspections',
      get: 'getInspection',
      create: 'createInspection',
      update: 'updateInspection',
      remove: 'deleteInspection',
    },
  }),

  submitInspection: async (id) => {
    const response = await api.post(`/inspections/${id}/submit`);
    return response.data;
  },

  verifyInspection: async (id) => {
    const response = await api.post(`/inspections/${id}/verify`);
    return response.data;
  },

  getInspectionPdf: async (id) => {
    const response = await api.get(`/inspections/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default inspectionService;