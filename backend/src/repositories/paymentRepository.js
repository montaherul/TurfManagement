import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const paymentSelect = {
  id: true,
  facilityId: true,
  bookingId: true,
  paymentNo: true,
  customerId: true,
  amount: true,
  method: true,
  tranId: true,
  status: true,
  platformFee: true,
  verifiedBy: true,
  verifiedAt: true,
  note: true,
  createdAt: true,
  updatedAt: true,
};

const paymentDetailSelect = {
  ...paymentSelect,
  booking: { select: { id: true, bookingNo: true, date: true, startTime: true, endTime: true, status: true, totalAmount: true } },
  customer: { select: { id: true, firstName: true, lastName: true, mobile: true, email: true } },
  verifier: { select: { id: true, firstName: true, lastName: true } },
};

export const paymentListRepository = createPaginatedRepository(prisma, 'Payment', {
  searchableFields: ['paymentNo', 'tranId'],
  filterMap: {
    status: 'status',
    facilityId: 'facilityId',
    bookingId: 'bookingId',
    method: 'method',
  },
  sortableFields: ['paymentNo', 'amount', 'status', 'createdAt', 'updatedAt'],
  select: paymentSelect,
  defaultSort: [{ createdAt: 'desc' }],
});

export const paymentRepository = {
  ...createBaseRepository(prisma, 'Payment', {
    select: paymentSelect,
    detailSelect: paymentDetailSelect,
  }),

  nextPaymentNo: async () => {
    const [last] = await prisma.$transaction([
      prisma.payment.findFirst({ orderBy: { paymentNo: 'desc' }, select: { paymentNo: true } }),
    ]);
    const seq = last ? parseInt(last.paymentNo.split('-')[1], 10) + 1 : 1;
    return `PAY-${String(seq).padStart(6, '0')}`;
  },

  pendingByFacility: (facilityId) =>
    prisma.payment.findMany({
      where: { facilityId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: paymentDetailSelect,
    }),

  walletSummary: async (facilityId) => {
    const [aggregate, pendingCount] = await Promise.all([
      prisma.payment.aggregate({
        where: { facilityId, status: 'VERIFIED' },
        _sum: { amount: true, platformFee: true },
        _count: true,
      }),
      prisma.payment.count({ where: { facilityId, status: 'PENDING' } }),
    ]);
    const dues = await prisma.booking.aggregate({
      where: { facilityId, status: 'CONFIRMED', dueAmount: { gt: 0 } },
      _sum: { dueAmount: true },
    });
    return {
      totalCollected: aggregate._sum.amount || 0,
      platformFees: aggregate._sum.platformFee || 0,
      verifiedPayments: aggregate._count,
      pendingVerifications: pendingCount,
      outstandingDues: dues._sum.dueAmount || 0,
    };
  },
};

export default paymentRepository;