import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import organizationSlice from './slices/organizationSlice';
import fieldSlice from './slices/fieldSlice';
import inspectionSlice from './slices/inspectionSlice';
import workOrderSlice from './slices/workOrderSlice';
import analyticsSlice from './slices/analyticsSlice';
import adminSlice from './slices/adminSlice';
import uiSlice from './slices/uiSlice';
import permissionsSlice from './slices/permissionsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    organizations: organizationSlice,
    fields: fieldSlice,
    inspections: inspectionSlice,
    workOrders: workOrderSlice,
    analytics: analyticsSlice,
    admin: adminSlice,
    ui: uiSlice,
    permissions: permissionsSlice,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;