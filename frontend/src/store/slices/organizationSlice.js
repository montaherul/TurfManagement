import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { subscriptionService } from '../../services/subscriptionService';

export const getSubscription = createAsyncThunk(
  'organizations/getSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await subscriptionService.getSubscription();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription');
    }
  }
);

export const updateSubscription = createAsyncThunk(
  'organizations/updateSubscription',
  async (data, { rejectWithValue }) => {
    try {
      const payload = await subscriptionService.updateSubscription(data);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update subscription');
    }
  }
);

export const createCheckoutSession = createAsyncThunk(
  'organizations/createCheckoutSession',
  async (planId, { rejectWithValue }) => {
    try {
      const payload = await subscriptionService.createCheckoutSession(planId);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start checkout');
    }
  }
);

const organizationSlice = createSlice({
  name: 'organizations',
  initialState: {
    organizations: [],
    currentOrganization: null,
    subscription: null,
    checkoutUrl: null,
    tranId: null,
    loading: false,
    error: null,
    pagination: null,
  },
  reducers: {
    clearOrganizationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.subscription = action.payload.subscription;
      })
      .addCase(getSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSubscription.fulfilled, (state, action) => {
        state.subscription = action.payload.subscription || state.subscription;
      })
      .addCase(createCheckoutSession.fulfilled, (state, action) => {
        state.checkoutUrl = action.payload.checkoutUrl;
        state.tranId = action.payload.tranId;
      });
  },
});

export const { clearOrganizationError } = organizationSlice.actions;
export default organizationSlice.reducer;