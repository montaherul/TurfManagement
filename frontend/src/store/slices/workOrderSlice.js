import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workOrderService } from '../../services/workOrderService';

export const getWorkOrders = createAsyncThunk(
  'workOrders/getWorkOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await workOrderService.getWorkOrders(params);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch work orders');
    }
  }
);

export const getCalendar = createAsyncThunk(
  'workOrders/getCalendar',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await workOrderService.getCalendar(params);
      return payload.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch calendar');
    }
  }
);

export const getWorkOrder = createAsyncThunk(
  'workOrders/getWorkOrder',
  async (id, { rejectWithValue }) => {
    try {
      const payload = await workOrderService.getWorkOrder(id);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch work order');
    }
  }
);

export const createWorkOrder = createAsyncThunk(
  'workOrders/createWorkOrder',
  async (data, { rejectWithValue }) => {
    try {
      const payload = await workOrderService.createWorkOrder(data);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create work order');
    }
  }
);

export const updateWorkOrder = createAsyncThunk(
  'workOrders/updateWorkOrder',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const payload = await workOrderService.updateWorkOrder(id, data);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update work order');
    }
  }
);

export const deleteWorkOrder = createAsyncThunk(
  'workOrders/deleteWorkOrder',
  async (id, { rejectWithValue }) => {
    try {
      await workOrderService.deleteWorkOrder(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete work order');
    }
  }
);

const workOrderSlice = createSlice({
  name: 'workOrders',
  initialState: {
    workOrders: [],
    currentWorkOrder: null,
    loading: false,
    error: null,
    pagination: null,
  },
  reducers: {
    clearWorkOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getWorkOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.workOrders = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(getWorkOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCalendar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCalendar.fulfilled, (state, action) => {
        state.loading = false;
        state.workOrders = action.payload;
      })
      .addCase(getCalendar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getWorkOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkOrder = action.payload.workOrder;
      })
      .addCase(getWorkOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearWorkOrderError } = workOrderSlice.actions;
export default workOrderSlice.reducer;