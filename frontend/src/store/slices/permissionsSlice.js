import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { permissionService } from '../../services/permissionService';

export const fetchCatalog = createAsyncThunk('permissions/catalog', async (_, { rejectWithValue }) => {
  try {
    return await permissionService.getCatalog();
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load permissions');
  }
});

export const fetchMyPermissions = createAsyncThunk('permissions/my', async (_, { rejectWithValue }) => {
  try {
    return await permissionService.getMyPermissions();
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load your permissions');
  }
});

export const fetchRolePermissions = createAsyncThunk('permissions/roles', async (_, { rejectWithValue }) => {
  try {
    return await permissionService.getRolePermissions();
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load role permissions');
  }
});

export const updateRolePermissions = createAsyncThunk(
  'permissions/updateRole',
  async ({ role, actions }, { rejectWithValue }) => {
    try {
      return await permissionService.updateRolePermissions(role, actions);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update role permissions');
    }
  }
);

export const fetchUserPermissions = createAsyncThunk(
  'permissions/user',
  async (userId, { rejectWithValue }) => {
    try {
      return await permissionService.getUserPermissions(userId);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load user permissions');
    }
  }
);

export const updateUserPermissions = createAsyncThunk(
  'permissions/updateUser',
  async ({ userId, allowed, denied }, { rejectWithValue }) => {
    try {
      return await permissionService.updateUserPermissions(userId, { allowed, denied });
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user permissions');
    }
  }
);

export const updateUser = createAsyncThunk(
  'permissions/updateTeamUser',
  async ({ userId, role, isActive }, { rejectWithValue }) => {
    try {
      return await permissionService.updateUser(userId, { role, isActive });
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user');
    }
  }
);

const initialState = {
  catalog: [],
  groups: {},
  myActions: [],
  roleConfig: [],
  userOverrides: null,
  loading: false,
  error: null,
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    clearPermissionsError: (state) => {
      state.error = null;
    },
    setUserOverrides: (state, action) => {
      state.userOverrides = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload.data?.catalog || [];
        state.groups = action.payload.data?.groups || {};
      })
      .addCase(fetchMyPermissions.fulfilled, (state, action) => {
        state.myActions = action.payload.data?.actions || [];
      })
      .addCase(fetchRolePermissions.fulfilled, (state, action) => {
        state.roleConfig = action.payload.data || [];
      })
      .addCase(updateRolePermissions.fulfilled, (state, action) => {
        const updated = action.payload.data;
        state.roleConfig = state.roleConfig.map((r) =>
          r.role === updated.role ? { role: updated.role, actions: updated.actions } : r
        );
      })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.userOverrides = action.payload.data;
      })
      .addCase(updateUserPermissions.fulfilled, (state, action) => {
        state.userOverrides = action.payload.data;
      })
      .addCase(updateRolePermissions.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearPermissionsError, setUserOverrides } = permissionsSlice.actions;
export default permissionsSlice.reducer;