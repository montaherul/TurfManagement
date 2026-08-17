import { z } from 'zod';

export const paginationQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      sort: z.string().max(100).optional(),
      search: z.string().max(200).optional(),
    })
    .passthrough(),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Resource id is required'),
  }),
});

export const nearbyQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().positive().max(500).optional(),
  }),
});