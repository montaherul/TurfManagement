import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminService } from '../../services/adminService';

export const getAdminUsers = createAsyncThunk(
  'admin/getUsers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await adminService.getUsers(params);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const getAdminFields = createAsyncThunk(
  'admin/getFields',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await adminService.getFields(params);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch fields');
    }
  }
);

export const getAdminHealth = createAsyncThunk(
  'admin/getHealth',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await adminService.getHealth();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch health');
    }
  }
);

export const getAuditLogs = createAsyncThunk(
  'admin/getAuditLogs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await adminService.getAuditLogs(params);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch audit logs');
    }
  }
);

const initialState = {
  users: [],
  adminFields: [],
  health: null,
  auditLogs: [],
  loading: false,
  error: null,
  pagination: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAdminUsers.fulfilled, (state, action) => {
        state.users = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(getAdminFields.fulfilled, (state, action) => {
        state.adminFields = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(getAdminHealth.fulfilled, (state, action) => {
        state.health = action.payload;
      })
      .addCase(getAuditLogs.fulfilled, (state, action) => {
        state.auditLogs = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(getAdminUsers.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(getAdminFields.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(getAuditLogs.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;