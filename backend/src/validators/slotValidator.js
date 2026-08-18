import { z } from 'zod';

export const listAvailabilitySchema = z.object({
  query: z.object({
    resourceId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }),
});

export const generateSlotsSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }),
});

export const listSlotsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    resourceId: z.string().optional(),
  }),
});

export const updateSlotSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['AVAILABLE', 'BLOCKED', 'MAINTENANCE']),
  }),
});

export default {
  listAvailabilitySchema,
  generateSlotsSchema,
  listSlotsSchema,
  updateSlotSchema,
};