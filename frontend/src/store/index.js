import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import permissionsSlice from './slices/permissionsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    permissions: permissionsSlice,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;