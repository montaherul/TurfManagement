import { z } from 'zod';

export const listFacilitiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().max(100).optional(),
    type: z.string().max(30).optional(),
    status: z.string().max(20).optional(),
    sort: z.string().max(50).optional(),
  }),
});

export const getFacilityBySlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1).max(100),
  }),
});

export const getFacilityByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const updateFacilityProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional(),
    address: z.object({
      line: z.string().optional(),
      area: z.string().optional(),
      city: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
    facebookUrl: z.string().max(200).optional(),
    bkashNumber: z.string().max(20).optional(),
    nagadNumber: z.string().max(20).optional(),
    operatingHours: z.record(z.string(), z.object({
      open: z.string().optional(),
      close: z.string().optional(),
      closed: z.boolean().optional(),
    })).optional(),
    description: z.string().max(2000).optional(),
    gallery: z.array(z.string()).optional(),
    cancellationPolicy: z.object({
      noticeHours: z.number().min(0).optional(),
      fullRefundHours: z.number().min(0).optional(),
      partialRefundPercent: z.number().min(0).max(100).optional(),
    }).optional(),
    logo: z.string().optional(),
    coverPhoto: z.string().optional(),
  }),
});

export const approveFacilitySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const rejectFacilitySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const facilityStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED']),
  }),
});

export const adminSettingsSchema = z.object({
  body: z.object({
    platformFee: z.coerce.number().int().min(0).optional(),
    smsProvider: z.string().max(100).optional(),
    refundNoticeHours: z.coerce.number().int().min(0).optional(),
  }),
});

export default {
  listFacilitiesSchema,
  getFacilityBySlugSchema,
  getFacilityByIdSchema,
  updateFacilityProfileSchema,
  approveFacilitySchema,
  rejectFacilitySchema,
  facilityStatusSchema,
  adminSettingsSchema,
};