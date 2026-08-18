import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const bookingSelect = {
  id: true,
  facilityId: true,
  bookingNo: true,
  customerId: true,
  resourceId: true,
  date: true,
  startTime: true,
  endTime: true,
  totalAmount: true,
  paidAmount: true,
  dueAmount: true,
  platformFee: true,
  status: true,
  paymentMethod: true,
  transactionId: true,
  otpVerifiedAt: true,
  checkInAt: true,
  checkOutAt: true,
  cancelledBy: true,
  cancelledAt: true,
  cancelReason: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const bookingDetailSelect = {
  ...bookingSelect,
  facility: { select: { id: true, name: true, slug: true } },
  customer: { select: { id: true, firstName: true, lastName: true, mobile: true, email: true } },
  resource: { select: { id: true, name: true, type: true, basePrice: true } },
  bookingItems: {
    select: { id: true, slot: { select: { id: true, startTime: true, endTime: true, price: true } } },
  },
  payments: {
    select: { id: true, paymentNo: true, amount: true, method: true, tranId: true, status: true, platformFee: true, createdAt: true },
  },
};

export const bookingListRepository = createPaginatedRepository(prisma, 'Booking', {
  searchableFields: ['bookingNo', 'transactionId'],
  filterMap: {
    status: 'status',
    facilityId: 'facilityId',
    customerId: 'customerId',
    resourceId: 'resourceId',
    date: 'date',
    paymentMethod: 'paymentMethod',
  },
  sortableFields: ['bookingNo', 'date', 'startTime', 'totalAmount', 'status', 'createdAt', 'updatedAt'],
  select: bookingSelect,
  defaultSort: [{ date: 'desc' }, { startTime: 'desc' }],
});

export const bookingRepository = {
  ...createBaseRepository(prisma, 'Booking', {
    select: bookingSelect,
    detailSelect: bookingDetailSelect,
  }),

  nextBookingNo: async () => {
    const [last] = await prisma.$transaction([
      prisma.booking.findFirst({ orderBy: { bookingNo: 'desc' }, select: { bookingNo: true } }),
    ]);
    const seq = last ? parseInt(last.bookingNo.split('-')[1], 10) + 1 : 1;
    return `BK-${String(seq).padStart(6, '0')}`;
  },

  listForCustomer: ({ customerId, tab, page = 1, limit = 20 }) => {
    const where = { customerId };
    if (tab === 'upcoming') where.status = 'CONFIRMED';
    else if (tab === 'completed') where.status = { in: ['COMPLETED', 'NO_SHOW'] };
    else if (tab === 'cancelled') where.status = { in: ['CANCELLED', 'REFUNDED'] };
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    return prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: bookingDetailSelect,
      }),
      prisma.booking.count({ where }),
    ]).then(([data, total]) => ({
      data,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    }));
  },

  todayByFacility: (facilityId, date) =>
    prisma.booking.findMany({
      where: { facilityId, date, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
      orderBy: { startTime: 'asc' },
      select: bookingDetailSelect,
    }),

  bookingItemsByBookingId: (bookingId) =>
    prisma.bookingItem.findMany({
      where: { bookingId },
      select: { id: true, slotId: true, slot: { select: { id: true, startTime: true, endTime: true, price: true, status: true } } },
    }),

  createBookingItems: (rows) =>
    prisma.bookingItem.createMany({ data: rows }),

  deleteBookingItems: (bookingId) =>
    prisma.bookingItem.deleteMany({ where: { bookingId } }),
};

export default bookingRepository;