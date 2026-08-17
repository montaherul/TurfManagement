import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Calendar from '../pages/workorders/Calendar';
import authReducer from '../store/slices/authSlice';
import permissionsReducer from '../store/slices/permissionsSlice';
import workOrderReducer from '../store/slices/workOrderSlice';

const renderWithProviders = (ui, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
      workOrders: workOrderReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'u-1', email: 'test@test.dev', role: 'org_admin', firstName: 'Test', lastName: 'User' },
        isAuthenticated: true,
        ...preloadedState.auth,
      },
      permissions: { catalog: [], myPermissions: { actions: [] }, roles: [], loading: false, error: null, ...preloadedState.permissions },
      workOrders: { workOrders: [], loading: false, error: null, pagination: null, ...preloadedState.workOrders },
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

describe('Calendar', () => {
  it('renders the calendar header', () => {
    renderWithProviders(<Calendar />);
    expect(screen.getByText('Maintenance Calendar')).toBeInTheDocument();
  });

  it('renders month navigation buttons', () => {
    renderWithProviders(<Calendar />);
    expect(screen.getByLabelText(/previous month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next month/i)).toBeInTheDocument();
  });

  it('dispatches getCalendar on mount', async () => {
    const mockDispatch = vi.fn();
    vi.doMock('../store/slices/workOrderSlice', () => ({
      getCalendar: () => ({ unwrap: () => Promise.resolve({ data: [] }) }),
    }));

    renderWithProviders(<Calendar />);
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
