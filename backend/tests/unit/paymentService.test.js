import { createPaymentService } from '../../src/services/paymentService.js';

const makePayment = (overrides = {}) => ({
  id: 'pay-1',
  facilityId: 'fac-1',
  bookingId: 'bk-1',
  paymentNo: 'PAY-000001',
  customerId: 'cust-1',
  amount: 1500,
  method: 'BKASH',
  tranId: 'TRX-1',
  status: 'PENDING',
  platformFee: 15,
  verifiedBy: null,
  verifiedAt: null,
  note: null,
  ...overrides,
});

const makeBooking = (overrides = {}) => ({
  id: 'bk-1',
  facilityId: 'fac-1',
  bookingNo: 'BK-000001',
  customerId: 'cust-1',
  resourceId: 'res-1',
  date: new Date('2026-08-20T00:00:00.000Z'),
  startTime: '10:00',
  endTime: '11:00',
  totalAmount: 1500,
  status: 'PENDING',
  ...overrides,
});

const makeService = () => {
  const state = { payments: [], bookings: [] };

  const paymentRepository = {
    findFirst: async (where) => state.payments.find((p) => p.id === where.id && (!where.facilityId || p.facilityId === where.facilityId)) || null,
    update: async (id, data) => {
      const payment = state.payments.find((p) => p.id === id);
      Object.assign(payment, data);
      return payment;
    },
    pendingByFacility: async (facilityId) => state.payments.filter((p) => p.facilityId === facilityId && p.status === 'PENDING'),
    walletSummary: async () => ({ totalCollected: 1500, platformFees: 15, verifiedPayments: 1, pendingVerifications: 0, outstandingDues: 0 }),
  };

  const bookingRepository = {
    update: async (id, data) => {
      const booking = state.bookings.find((b) => b.id === id);
      Object.assign(booking, data);
      return booking;
    },
    findById: async (id) => state.bookings.find((b) => b.id === id) || null,
    bookingItemsByBookingId: async () => [{ id: 'bi-1', slotId: 'slot-1' }],
    deleteBookingItems: async () => {},
  };

  const notifications = [];
  const notificationService = {
    notifyUser: async (userId, event, payload) => notifications.push({ userId, event, payload }),
    notifyFacility: async () => {},
  };

  const audits = [];
  const auditLogRepository = { create: async (entry) => audits.push(entry) };

  const service = createPaymentService({
    paymentRepository,
    paymentListRepository: { list: async () => ({ data: [], pagination: {} }) },
    bookingRepository,
    notificationService,
    auditLogRepository,
  });

  return { service, state, notifications, audits };
};

describe('createPaymentService', () => {
  describe('verify', () => {
    it('verifies PENDING payment and confirms the booking', async () => {
      const { service, state } = makeService();
      state.payments.push(makePayment());
      state.bookings.push(makeBooking());
      const result = await service.verify({ facilityId: 'fac-1', id: 'pay-1', verifierId: 'staff-1' });
      expect(result.payment.status).toBe('VERIFIED');
      expect(result.payment.verifiedBy).toBe('staff-1');
      expect(result.payment.platformFee).toBe(15);
      expect(result.booking.status).toBe('CONFIRMED');
    });

    it('rejects already-verified payments', async () => {
      const { service, state } = makeService();
      state.payments.push(makePayment({ status: 'VERIFIED' }));
      await expect(service.verify({ facilityId: 'fac-1', id: 'pay-1', verifierId: 'staff-1' })).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });
    });

    it('returns 404 when the payment is outside the facility', async () => {
      const { service, state } = makeService();
      state.payments.push(makePayment());
      await expect(service.verify({ facilityId: 'fac-OTHER', id: 'pay-1', verifierId: 'staff-1' })).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    });
  });

  describe('reject', () => {
    it('rejects PENDING payment, cancels the booking and frees items', async () => {
      const { service, state, notifications } = makeService();
      state.payments.push(makePayment());
      state.bookings.push(makeBooking());
      const result = await service.reject({ facilityId: 'fac-1', id: 'pay-1', verifierId: 'staff-1', reason: 'TXN ID mismatch' });
      expect(result.payment.status).toBe('REJECTED');
      expect(result.booking.status).toBe('CANCELLED');
      expect(result.booking.cancelReason).toBe('TXN ID mismatch');
      expect(notifications.some((n) => n.event === 'payment:rejected')).toBe(true);
    });

    it('refuses to reject a non-pending payment', async () => {
      const { service, state } = makeService();
      state.payments.push(makePayment({ status: 'REFUNDED' }));
      await expect(service.reject({ facilityId: 'fac-1', id: 'pay-1', verifierId: 'staff-1' })).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });
    });
  });
});