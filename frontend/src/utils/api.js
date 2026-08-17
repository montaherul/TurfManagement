import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const getRefreshToken = () => {
  const stored = localStorage.getItem('refreshToken');
  if (stored) return stored;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('refreshToken='));
  return match ? match.split('=')[1] : null;
};

const redirectToLogin = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

let refreshPromise = null;

const performRefresh = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const response = await axios.post(
    `${API_URL}/auth/refresh`,
    {},
    {
      headers: { 'x-refresh-token': refreshToken },
      withCredentials: true,
    }
  );
  return response.data.data.accessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || performRefresh();
        const newAccessToken = await refreshPromise;
        refreshPromise = null;

        localStorage.setItem('accessToken', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getApiError = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export default api;