import { z } from 'zod';
import { paginationQuerySchema, idParamSchema } from './common.js';

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

export const updateOrganizationSchema = z.object({
  params: idParamSchema.shape.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().min(2).max(100).optional(),
    logo: z.string().trim().max(500).optional(),
    address: z.record(z.any()).optional(),
    primaryContact: z.record(z.any()).optional(),
    subscription: z.record(z.any()).optional(),
    settings: z.record(z.any()).optional(),
  }),
});

export const suspendOrganizationSchema = z.object({
  params: idParamSchema.shape.params,
  body: z.object({
    suspended: z.boolean().optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User id is required'),
  }),
  body: z.object({
    role: z.enum(['super_admin', 'org_admin', 'inspector', 'viewer']).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateRolePermissionsSchema = z.object({
  params: z.object({
    role: z.enum(['super_admin', 'org_admin', 'inspector', 'viewer']),
  }),
  body: z.object({
    actions: z.array(z.string()).optional(),
  }),
});

export const updateUserPermissionsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User id is required'),
  }),
  body: z.object({
    allowed: z.array(z.string()).optional(),
    denied: z.array(z.string()).optional(),
  }),
});