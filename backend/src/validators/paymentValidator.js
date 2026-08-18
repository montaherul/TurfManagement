import { z } from 'zod';

export const listPaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().max(100).optional(),
    status: z.string().max(20).optional(),
    bookingId: z.string().optional(),
    method: z.string().max(20).optional(),
    sort: z.string().max(50).optional(),
  }),
});

export const paymentActionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export default {
  listPaymentsSchema,
  paymentActionSchema,
};