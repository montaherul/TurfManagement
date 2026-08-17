import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NewInspection from '../pages/inspections/NewInspection';
import authReducer from '../store/slices/authSlice';
import permissionsReducer from '../store/slices/permissionsSlice';
import fieldReducer from '../store/slices/fieldSlice';
import inspectionReducer from '../store/slices/inspectionSlice';

const renderWithProviders = (ui, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
      fields: fieldReducer,
      inspections: inspectionReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'u-1', email: 'test@test.dev', role: 'inspector', firstName: 'Test', lastName: 'User' },
        isAuthenticated: true,
        ...preloadedState.auth,
      },
      permissions: { catalog: [], myPermissions: { actions: [] }, roles: [], loading: false, error: null, ...preloadedState.permissions },
      fields: { fields: [], loading: false, error: null, pagination: null, ...preloadedState.fields },
      inspections: { inspections: [], currentInspection: null, loading: false, error: null, pagination: null, ...preloadedState.inspections },
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

describe('NewInspection', () => {
  it('renders the new inspection form', () => {
    renderWithProviders(<NewInspection />);
    expect(screen.getByText('New Inspection')).toBeInTheDocument();
    expect(screen.getByLabelText(/field/i)).toBeInTheDocument();
  });

  it('shows offline save message when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const mockSave = vi.fn();
    vi.doMock('../../utils/indexedDB', () => ({
      offlineDB: { saveInspection: mockSave },
    }));

    renderWithProviders(<NewInspection />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
