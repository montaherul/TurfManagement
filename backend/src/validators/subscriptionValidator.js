import { z } from 'zod';

export const updateSubscriptionSchema = z.object({
  body: z.object({
    planId: z.enum(['free', 'basic', 'professional']).optional(),
    billingModel: z.enum(['subscription', 'one_time', 'manual']).optional(),
  }),
});

export const checkoutSchema = z.object({
  body: z.object({
    planId: z.enum(['free', 'basic', 'professional']),
  }),
});