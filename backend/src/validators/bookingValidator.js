import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    resourceId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    paymentMethod: z.enum(['BKASH', 'NAGAD', 'CASH']),
    transactionId: z.string().min(3).max(50),
    notes: z.string().max(500).optional(),
  }),
});

export const listBookingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().max(100).optional(),
    status: z.string().max(20).optional(),
    resourceId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sort: z.string().max(50).optional(),
  }),
});

export const myBookingsSchema = z.object({
  query: z.object({
    tab: z.enum(['upcoming', 'completed', 'cancelled']).default('upcoming'),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const getBookingSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const cancelBookingSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const bookingActionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const todayBookingsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export default {
  createBookingSchema,
  listBookingsSchema,
  myBookingsSchema,
  getBookingSchema,
  cancelBookingSchema,
  bookingActionSchema,
  todayBookingsSchema,
};