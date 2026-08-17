import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

const paymentSelect = {
  id: true,
  organizationId: true,
  invoiceNo: true,
  tranId: true,
  valId: true,
  planId: true,
  planName: true,
  amountBDT: true,
  currency: true,
  status: true,
  paymentMethod: true,
  billToName: true,
  billToEmail: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
};

export const paymentRepository = {
  ...createBaseRepository(prisma, 'Payment', { select: paymentSelect }),

  findByTranId: (tranId) =>
    prisma.payment.findFirst({ where: { tranId }, select: paymentSelect }),

  findByInvoiceNo: (invoiceNo) =>
    prisma.payment.findFirst({ where: { invoiceNo }, select: paymentSelect }),

  upsertByTranId: async (tranId, data) => {
    const existing = await prisma.payment.findFirst({ where: { tranId }, select: { id: true } });
    if (existing) {
      const payment = await prisma.payment.update({ where: { id: existing.id }, data, select: paymentSelect });
      return { payment, created: false };
    }
    const payment = await prisma.payment.create({ data: { ...data, tranId }, select: paymentSelect });
    return { payment, created: true };
  },

  countForYear: (year) =>
    prisma.payment.count({ where: { invoiceNo: { startsWith: `INV-${year}-` } } }),
};

export default paymentRepository;