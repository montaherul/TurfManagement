import { z } from 'zod';
import { paginationQuerySchema, idParamSchema } from './common.js';

const costSchema = z
  .object({
    amount: z.number().nonnegative().optional(),
    currency: z.string().max(10).optional(),
  })
  .optional();

export const createWorkOrderSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    fieldId: z.string().min(1, 'fieldId is required'),
    description: z.string().trim().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    tasks: z.array(z.record(z.any())).optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().datetime({ offset: true }).or(z.coerce.date()).optional(),
    estimatedCost: costSchema,
    actualCost: costSchema,
    notes: z.string().trim().max(2000).optional(),
  }),
});

export const updateWorkOrderSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['created', 'assigned', 'in_progress', 'completed', 'verified', 'cancelled']).optional(),
    tasks: z.array(z.record(z.any())).optional(),
    assignedTo: z.string().nullable().optional(),
    dueDate: z.string().datetime({ offset: true }).or(z.coerce.date()).nullable().optional(),
    estimatedCost: costSchema,
    actualCost: costSchema,
    notes: z.string().trim().max(2000).optional(),
  }),
});

export const listWorkOrdersSchema = paginationQuerySchema;
export const getWorkOrderSchema = idParamSchema;