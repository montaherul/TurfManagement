import { z } from 'zod';

const resourceType = z.enum([
  'FOOTBALL', 'BADMINTON', 'POOL', 'SNOOKER', 'CRICKET',
  'BASKETBALL', 'TENNIS', 'OTHER',
]);

const scheduleTemplateSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  stepMinutes: z.number().int().min(15).max(240).default(60),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  peakRanges: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    price: z.number().int().min(0),
  })).optional(),
});

export const listResourcesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().max(100).optional(),
    type: resourceType.optional(),
    status: z.string().max(20).optional(),
    sort: z.string().max(50).optional(),
  }),
});

export const getResourceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createResourceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    type: resourceType,
    capacity: z.number().int().min(1).default(1),
    basePrice: z.number().int().min(0).default(0),
    scheduleTemplate: scheduleTemplateSchema.optional(),
  }),
});

export const updateResourceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    type: resourceType.optional(),
    capacity: z.number().int().min(1).optional(),
    basePrice: z.number().int().min(0).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
    scheduleTemplate: scheduleTemplateSchema.nullable().optional(),
  }),
});

export default {
  listResourcesSchema,
  getResourceSchema,
  createResourceSchema,
  updateResourceSchema,
};