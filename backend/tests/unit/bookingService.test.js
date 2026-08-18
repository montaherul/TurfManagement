import { createBookingService } from '../../src/services/bookingService.js';

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
  paidAmount: 1500,
  dueAmount: 0,
  platformFee: 15,
  status: 'PENDING',
  paymentMethod: 'BKASH',
  transactionId: 'TRX-1',
  otpVerifiedAt: new Date(),
  checkInAt: null,
  checkOutAt: null,
  cancelledBy: null,
  cancelledAt: null,
  cancelReason: null,
  notes: null,
  ...overrides,
});

const makeService = () => {
  const state = {
    bookings: [],
    payments: [],
    slots: [],
    bookingNo: 1,
    paymentNo: 1,
  };

  const bookingRepository = {
    create: async (data) => {
      const booking = { id: `bk-${state.bookingNo}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      state.bookings.push(booking);
      return booking;
    },
    update: async (id, data) => {
      const booking = state.bookings.find((b) => b.id === id);
      Object.assign(booking, data);
      return booking;
    },
    findFirst: async (where) =>
      state.bookings.find((b) => (where.id ? b.id === where.id : true) && (where.facilityId ? b.facilityId === where.facilityId : true)) || null,
    findById: async (id) => state.bookings.find((b) => b.id === id) || null,
    nextBookingNo: async () => {
      const no = `BK-${String(state.bookingNo).padStart(6, '0')}`;
      state.bookingNo += 1;
      return no;
    },
    createBookingItems: async () => {},
    listForFacility: async () => ({ data: state.bookings, pagination: {} }),
    todayByFacility: async () => state.bookings,
  };

  const slotRepository = {
    findForResourceAndDate: async (resourceId, date) => state.slots.filter((s) => s.resourceId === resourceId),
    updateMany: async (where, data) => {
      state.slots.forEach((s) => {
        if (where.id?.in?.includes(s.id)) Object.assign(s, data);
      });
    },
  };

  const resourceRepository = {
    findById: async (id) => (id === 'res-1' ? { id: 'res-1', facilityId: 'fac-1', status: 'ACTIVE', name: 'Main 5v5 Turf' } : null),
  };

  const facilityRepository = {
    findById: async (id) => (id === 'fac-1' ? { id: 'fac-1', name: 'Demo Turf', status: 'ACTIVE' } : null),
  };

  const blacklistRepository = {
    findForCustomer: async () => null,
  };

  const paymentRepository = {
    create: async (data) => {
      const payment = { id: `pay-${state.paymentNo}`, ...data };
      state.payments.push(payment);
      return payment;
    },
    update: async (id, data) => {
      const payment = state.payments.find((p) => p.id === id);
      Object.assign(payment, data);
      return payment;
    },
    findFirst: async (where) => state.payments.find((p) => p.id === where.id) || null,
    nextPaymentNo: async () => {
      const no = `PAY-${String(state.paymentNo).padStart(6, '0')}`;
      state.paymentNo += 1;
      return no;
    },
  };

  const notificationService = {
    notifyFacility: async () => {},
    notifyUser: async () => {},
  };

  const auditLogRepository = { create: async () => {} };

  const service = createBookingService({
    bookingRepository,
    slotRepository,
    resourceRepository,
    facilityRepository,
    blacklistRepository,
    paymentRepository,
    notificationService,
    auditLogRepository,
  });

  return { service, state };
};

describe('createBookingService', () => {
  describe('create', () => {
    it('rejects without payment proof', async () => {
      const { service } = makeService();
      await expect(
        service.create({ customerId: 'cust-1', data: { resourceId: 'res-1' } })
      ).rejects.toMatchObject({ statusCode: 422, code: 'PAYMENT_PROOF_REQUIRED' });
    });

    it('rejects invalid payment method', async () => {
      const { service } = makeService();
      await expect(
        service.create({
          customerId: 'cust-1',
          data: { resourceId: 'res-1', paymentMethod: 'BITCOIN', transactionId: 'X' },
        })
      ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    });

    it('rejects non-existent resource', async () => {
      const { service } = makeService();
      await expect(
        service.create({
          customerId: 'cust-1',
          data: { resourceId: 'nope', paymentMethod: 'BKASH', transactionId: 'X' },
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects when slots do not exist', async () => {
      const { service, state } = makeService();
      state.slots.push({
        id: 'slot-1',
        resourceId: 'res-1',
        date: new Date('2026-08-20T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        price: 1500,
        status: 'AVAILABLE',
      });
      await expect(
        service.create({
          customerId: 'cust-1',
          data: {
            resourceId: 'res-1',
            date: '2026-08-20',
            startTime: '12:00',
            endTime: '13:00',
            paymentMethod: 'BKASH',
            transactionId: 'TRX-1',
          },
        })
      ).rejects.toMatchObject({ statusCode: 422, code: 'SLOTS_UNAVAILABLE' });
    });

    it('creates PENDING booking with platform fee and PENDING payment', async () => {
      const { service, state } = makeService();
      state.slots.push({
        id: 'slot-1',
        resourceId: 'res-1',
        date: new Date('2026-08-20T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        price: 1500,
        status: 'AVAILABLE',
      });
      const result = await service.create({
        customerId: 'cust-1',
        data: {
          resourceId: 'res-1',
          date: '2026-08-20',
          startTime: '10:00',
          endTime: '11:00',
          paymentMethod: 'BKASH',
          transactionId: 'TRX-1',
        },
      });
      expect(result.status).toBe('PENDING');
      expect(result.bookingNo).toBe('BK-000001');
      expect(result.totalAmount).toBe(1500);
      expect(result.platformFee).toBe(15);
      
      
      expect(state.slots[0].status).toBe('BOOKED');
    });

    it('derives facility from resource when caller has no facility (booker)', async () => {
      const { service, state } = makeService();
      state.slots.push({
        id: 'slot-2',
        resourceId: 'res-1',
        date: new Date('2026-08-21T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        price: 1500,
        status: 'AVAILABLE',
      });
      const result = await service.create({
        facilityId: null,
        customerId: 'cust-1',
        data: {
          resourceId: 'res-1',
          date: '2026-08-21',
          startTime: '10:00',
          endTime: '11:00',
          paymentMethod: 'NAGAD',
          transactionId: 'TRX-2',
        },
      });
      expect(result.facilityId).toBe('fac-1');
    });
  });

  describe('lifecycle transitions', () => {
    it('check-in, complete flow', async () => {
      const { service, state } = makeService();
      state.bookings.push(makeBooking({ status: 'CONFIRMED' }));
      const checkedIn = await service.checkIn({ facilityId: 'fac-1', id: 'bk-1' });
      expect(checkedIn.status).toBe('CONFIRMED');
      expect(checkedIn.checkInAt).toBeInstanceOf(Date);
      const completed = await service.complete({ facilityId: 'fac-1', id: 'bk-1' });
      expect(completed.status).toBe('COMPLETED');
    });

    it('cannot complete a PENDING booking', async () => {
      const { service, state } = makeService();
      state.bookings.push(makeBooking({ status: 'PENDING' }));
      await expect(service.complete({ facilityId: 'fac-1', id: 'bk-1' })).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });
    });

    it('booker cannot cancel someone elses booking', async () => {
      const { service, state } = makeService();
      state.bookings.push(makeBooking({ status: 'CONFIRMED', customerId: 'cust-9' }));
      await expect(
        service.cancel({ facilityId: 'fac-1', id: 'bk-1', actorId: 'cust-1', actorRole: 'booker', reason: 'change of plans' })
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });
  });
});