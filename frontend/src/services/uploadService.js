import api from '../utils/api';

export const uploadService = {
  uploadPhoto: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSignedUrl: async () => {
    const response = await api.get('/upload/signed-url');
    return response.data;
  },
};