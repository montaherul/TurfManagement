import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const createAdminUserSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email is required').toLowerCase(),
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    role: z.enum(['super_admin', 'org_admin', 'inspector', 'viewer']).default('inspector'),
    password: z.string().min(8).max(128).optional(),
    organizationId: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listAdminUsersSchema = paginationQuerySchema;
export const listAdminFieldsSchema = paginationQuerySchema;
export const listAuditLogsSchema = paginationQuerySchema;
export const listOrganizationsSchema = paginationQuerySchema;

const scoringWeightField = z.number().min(0).max(20);

export const updateOrganizationSettingsSchema = z.object({
  body: z
    .object({
      scoringWeights: z
        .object({
          surface: scoringWeightField.optional(),
          soil: scoringWeightField.optional(),
          structural: scoringWeightField.optional(),
          grass: scoringWeightField.optional(),
          maintenance: scoringWeightField.optional(),
        })
        .optional(),
    })
    .strict(),
});