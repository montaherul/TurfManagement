import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Layout from '../components/layout/Layout';
import authReducer from '../store/slices/authSlice';
import permissionsReducer from '../store/slices/permissionsSlice';
import uiReducer from '../store/slices/uiSlice';

vi.mock('../utils/offlineQueue', () => ({
  offlineQueue: { processQueue: vi.fn(() => Promise.resolve(0)) },
}));

const renderWithProviders = (ui, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'u-1', email: 'test@test.dev', role: 'org_admin', firstName: 'Test', lastName: 'User' },
        isAuthenticated: true,
        ...preloadedState.auth,
      },
      permissions: { catalog: [], myPermissions: { actions: [] }, roles: [], loading: false, error: null, ...preloadedState.permissions },
      ui: { sidebarOpen: true, theme: 'light', ...preloadedState.ui },
    },
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </Provider>
  );
};

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sidebar navigation', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText('TurfCare BD')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Work Orders')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('shows offline banner when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    window.dispatchEvent(new Event('offline'));
    renderWithProviders(<Layout />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
