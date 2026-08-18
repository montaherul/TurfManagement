import api from '../utils/api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  applyForFacility: async (application) => {
    const response = await api.post('/auth/apply', application);
    return response.data;
  },

  requestOtp: async (mobile, purpose = 'LOGIN') => {
    const response = await api.post('/auth/otp/request', { mobile, purpose });
    return response.data;
  },

  verifyOtp: async (mobile, code, purpose = 'LOGIN') => {
    const response = await api.post('/auth/otp/verify', { mobile, purpose, code });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;