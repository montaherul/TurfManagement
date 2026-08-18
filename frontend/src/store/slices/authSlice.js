import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

const token = localStorage.getItem('accessToken');

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const payload = await authService.login(email, password);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const applyForFacility = createAsyncThunk(
  'auth/apply',
  async (application, { rejectWithValue }) => {
    try {
      const payload = await authService.applyForFacility(application);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Application failed');
    }
  }
);

export const requestOtp = createAsyncThunk(
  'auth/otpRequest',
  async (mobile, { rejectWithValue }) => {
    try {
      const payload = await authService.requestOtp(mobile);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send OTP');
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/otpVerify',
  async ({ mobile, code }, { rejectWithValue }) => {
    try {
      const payload = await authService.verifyOtp(mobile, code);
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'OTP verification failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Logout failed');
  }
});

export const fetchCurrentUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const payload = await authService.getProfile();
      return payload.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load profile');
    }
  }
);

const initialState = {
  user: null,
  token: token || null,
  isAuthenticated: !!token,
  loading: !!token,
  error: null,
  otpSent: false,
  otpDevCode: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.otpSent = false;
      state.otpDevCode = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    clearError: (state) => {
      state.error = null;
    },
    clearOtpState: (state) => {
      state.otpSent = false;
      state.otpDevCode = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.accessToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(applyForFacility.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyForFacility.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(applyForFacility.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(requestOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = true;
        state.otpDevCode = action.payload.devCode || null;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        state.otpSent = false;
        state.otpDevCode = null;
        localStorage.setItem('accessToken', action.payload.accessToken);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('accessToken');
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      });
  },
});

export const { logout, clearError, clearOtpState } = authSlice.actions;
export default authSlice.reducer;