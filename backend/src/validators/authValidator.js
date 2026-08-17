import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email is required').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    organizationName: z.string().trim().min(2).max(100).optional(),
    orgName: z.string().trim().min(2).max(100).optional(),
    organizationSlug: z.string().trim().min(2).max(100).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email is required').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({});