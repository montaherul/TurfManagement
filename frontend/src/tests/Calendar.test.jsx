import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Calendar from '../pages/workorders/Calendar';
import authReducer from '../store/slices/authSlice';
import permissionsReducer from '../store/slices/permissionsSlice';
import workOrderReducer from '../store/slices/workOrderSlice';
import { workOrderService } from '../services/workOrderService';

vi.mock('../services/workOrderService', () => ({
  workOrderService: { getCalendar: vi.fn() },
}));

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
  it('renders the calendar header', async () => {
    workOrderService.getCalendar.mockResolvedValue({ data: [] });
    renderWithProviders(<Calendar />);
    expect(await screen.findByText('Maintenance Calendar')).toBeInTheDocument();
  });

  it('renders month navigation buttons', async () => {
    workOrderService.getCalendar.mockResolvedValue({ data: [] });
    renderWithProviders(<Calendar />);
    expect(await screen.findByLabelText(/previous month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next month/i)).toBeInTheDocument();
  });

  it('dispatches getCalendar on mount', async () => {
    workOrderService.getCalendar.mockResolvedValue({ data: [] });
    renderWithProviders(<Calendar />);
    await waitFor(() => {
      expect(workOrderService.getCalendar).toHaveBeenCalled();
    });
  });
});
