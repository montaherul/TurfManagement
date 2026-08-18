import { z } from 'zod';

const mobileSchema = z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number');

export const listBlacklistSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().max(100).optional(),
    category: z.string().max(30).optional(),
    sort: z.string().max(50).optional(),
  }),
});

export const createBlacklistSchema = z.object({
  body: z.object({
    customerId: z.string().min(1).optional(),
    teamName: z.string().max(100).optional(),
    category: z.enum([
      'REPEATED_NO_SHOW', 'PAYMENT_FRAUD', 'MISCONDUCT', 'PROPERTY_DAMAGE', 'VERBAL_ABUSE',
    ]),
    reason: z.string().max(500).optional(),
  }),
});

export const blacklistActionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const customerByMobileSchema = z.object({
  query: z.object({
    mobile: mobileSchema,
  }),
});

export default {
  listBlacklistSchema,
  createBlacklistSchema,
  blacklistActionSchema,
  customerByMobileSchema,
};