import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inspectionService } from '../../services/inspectionService';

export const getInspections = createAsyncThunk(
  'inspections/getInspections',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await inspectionService.getInspections(params);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inspections');
    }
  }
);

export const getInspection = createAsyncThunk(
  'inspections/getInspection',
  async (id, { rejectWithValue }) => {
    try {
      const payload = await inspectionService.getInspection(id);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inspection');
    }
  }
);

export const createInspection = createAsyncThunk(
  'inspections/createInspection',
  async (data, { rejectWithValue }) => {
    try {
      const payload = await inspectionService.createInspection(data);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create inspection');
    }
  }
);

export const updateInspection = createAsyncThunk(
  'inspections/updateInspection',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const payload = await inspectionService.updateInspection(id, data);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update inspection');
    }
  }
);

export const submitInspection = createAsyncThunk(
  'inspections/submitInspection',
  async (id, { rejectWithValue }) => {
    try {
      const payload = await inspectionService.submitInspection(id);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit inspection');
    }
  }
);

export const verifyInspection = createAsyncThunk(
  'inspections/verifyInspection',
  async (id, { rejectWithValue }) => {
    try {
      const payload = await inspectionService.verifyInspection(id);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify inspection');
    }
  }
);

export const deleteInspection = createAsyncThunk(
  'inspections/deleteInspection',
  async (id, { rejectWithValue }) => {
    try {
      await inspectionService.deleteInspection(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete inspection');
    }
  }
);

const inspectionSlice = createSlice({
  name: 'inspections',
  initialState: {
    inspections: [],
    currentInspection: null,
    loading: false,
    error: null,
    pagination: null,
  },
  reducers: {
    clearInspectionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getInspections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInspections.fulfilled, (state, action) => {
        state.loading = false;
        state.inspections = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(getInspections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getInspection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInspection.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInspection = action.payload.inspection;
      })
      .addCase(getInspection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(submitInspection.fulfilled, (state, action) => {
        if (state.currentInspection) {
          state.currentInspection = action.payload.inspection || state.currentInspection;
        }
      })
      .addCase(verifyInspection.fulfilled, (state, action) => {
        if (state.currentInspection) {
          state.currentInspection = action.payload.inspection || state.currentInspection;
        }
      });
  },
});

export const { clearInspectionError } = inspectionSlice.actions;
export default inspectionSlice.reducer;