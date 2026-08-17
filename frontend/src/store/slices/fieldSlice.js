import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fieldService } from '../../services/fieldService';

export const getFields = createAsyncThunk(
  'fields/getFields',
  async (params = {}, { rejectWithValue }) => {
    try {
      const payload = await fieldService.getFields(params);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch fields');
    }
  }
);

export const getField = createAsyncThunk(
  'fields/getField',
  async (id, { rejectWithValue }) => {
    try {
      const payload = await fieldService.getField(id);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch field');
    }
  }
);

export const createField = createAsyncThunk(
  'fields/createField',
  async (fieldData, { rejectWithValue }) => {
    try {
      const payload = await fieldService.createField(fieldData);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create field');
    }
  }
);

export const updateField = createAsyncThunk(
  'fields/updateField',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const payload = await fieldService.updateField(id, data);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update field');
    }
  }
);

export const deleteField = createAsyncThunk(
  'fields/deleteField',
  async (id, { rejectWithValue }) => {
    try {
      await fieldService.deleteField(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete field');
    }
  }
);

const fieldSlice = createSlice({
  name: 'fields',
  initialState: {
    fields: [],
    currentField: null,
    loading: false,
    error: null,
    pagination: null,
  },
  reducers: {
    clearFieldError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFields.fulfilled, (state, action) => {
        state.loading = false;
        state.fields = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(getFields.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getField.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getField.fulfilled, (state, action) => {
        state.loading = false;
        state.currentField = action.payload.field;
      })
      .addCase(getField.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearFieldError } = fieldSlice.actions;
export default fieldSlice.reducer;