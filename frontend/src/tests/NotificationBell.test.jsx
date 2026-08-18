import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../components/layout/NotificationBell';

vi.mock('../services/notificationService', () => ({
  notificationService: {
    list: vi.fn(async () => ({
      data: {
        data: [
          {
            id: 'n-1',
            event: 'work_order:created',
            title: 'New work order: Fix drainage',
            message: 'A new work order (WO-001) was created with high priority.',
            readAt: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'n-2',
            event: 'inspection:verified',
            title: 'Inspection verified',
            message: 'An inspection you submitted has been verified.',
            readAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
      },
    })),
    unreadCount: vi.fn(async () => ({ data: { count: 1 } })),
    markRead: vi.fn(async () => ({ data: { marked: true } })),
    markAllRead: vi.fn(async () => ({ data: { marked: true } })),
    clearRead: vi.fn(async () => ({ data: { cleared: true } })),
  },
}));

vi.mock('../services/socketService', () => ({
  connectSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows unread count badge', async () => {
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('opens the dropdown with notifications on click', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByLabelText('Notifications'));

    await waitFor(() => {
      expect(screen.getByText('New work order: Fix drainage')).toBeInTheDocument();
      expect(screen.getByText('Inspection verified')).toBeInTheDocument();
    });
  });
});