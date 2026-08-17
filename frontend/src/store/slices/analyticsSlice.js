import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reportService } from '../../services/reportService';

export const getAnalytics = createAsyncThunk(
  'analytics/getAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await reportService.getAnalytics();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }
);

export const getScoreTrends = createAsyncThunk(
  'analytics/getScoreTrends',
  async (fieldId, { rejectWithValue }) => {
    try {
      const payload = await reportService.getScoreTrends(fieldId);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch score trends');
    }
  }
);

export const getScoreDistribution = createAsyncThunk(
  'analytics/getScoreDistribution',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await reportService.getScoreDistribution();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch score distribution');
    }
  }
);

export const getWorkOrderStatus = createAsyncThunk(
  'analytics/getWorkOrderStatus',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await reportService.getWorkOrderStatus();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch work order status');
    }
  }
);

export const getMaintenanceCosts = createAsyncThunk(
  'analytics/getMaintenanceCosts',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await reportService.getMaintenanceCosts();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch maintenance costs');
    }
  }
);

const initialState = {
  analytics: null,
  scoreTrends: [],
  scoreDistribution: [],
  workOrderStatus: [],
  maintenanceCosts: [],
  loading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalyticsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload.dashboard || action.payload;
      })
      .addCase(getAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getScoreTrends.fulfilled, (state, action) => {
        state.scoreTrends = action.payload.trends || action.payload.series || [];
      })
      .addCase(getScoreDistribution.fulfilled, (state, action) => {
        state.scoreDistribution = action.payload.distribution || action.payload.buckets || [];
      })
      .addCase(getWorkOrderStatus.fulfilled, (state, action) => {
        state.workOrderStatus = action.payload.counts || action.payload.byStatus || [];
      })
      .addCase(getMaintenanceCosts.fulfilled, (state, action) => {
        state.maintenanceCosts = action.payload.costs || action.payload.byMonth || [];
      });
  },
});

export const { clearAnalyticsError } = analyticsSlice.actions;
export default analyticsSlice.reducer;