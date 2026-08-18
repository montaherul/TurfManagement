import { z } from 'zod';

const mobileSchema = z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number');

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const applyForFacilitySchema = z.object({
  body: z.object({
    facilityName: z.string().min(2, 'Facility name is required').max(100),
    ownerName: z.string().min(2, 'Owner name is required').max(100),
    ownerEmail: z.string().email('Invalid email'),
    ownerPhone: mobileSchema,
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.object({
      line: z.string().optional(),
      area: z.string().optional(),
      city: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
    description: z.string().max(2000).optional(),
  }),
});

export const requestOtpSchema = z.object({
  body: z.object({
    mobile: mobileSchema,
    purpose: z.enum(['LOGIN', 'BOOKING']).default('LOGIN'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    mobile: mobileSchema,
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    purpose: z.enum(['LOGIN', 'BOOKING']).default('LOGIN'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export default {
  loginSchema,
  applyForFacilitySchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
};