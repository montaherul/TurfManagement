import { z } from 'zod';
import { paginationQuerySchema, idParamSchema, nearbyQuerySchema } from './common.js';

const gpsSchema = z
  .object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .optional();

const addressSchema = z.union([z.string().trim().max(300), z.record(z.any())]).optional();

export const createFieldSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Field name is required').max(120),
    sportType: z.enum(['cricket', 'football', 'multi_sport', 'tennis', 'rugby', 'other']).default('football'),
    turfType: z.enum(['natural_grass', 'hybrid', 'artificial', 'sand_dressed']).optional(),
    fieldId: z.string().trim().min(1).max(40).optional(),
    grassSpecies: z.string().trim().max(80).optional(),
    drainageType: z.string().trim().max(80).optional(),
    status: z.enum(['active', 'maintenance', 'inactive', 'archived']).optional(),
    location: z.record(z.any()).optional(),
    address: addressSchema,
    dimensions: z.record(z.any()).optional(),
    gpsCoordinates: gpsSchema,
    photos: z.array(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateFieldSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    sportType: z.enum(['cricket', 'football', 'multi_sport', 'tennis', 'rugby', 'other']).optional(),
    turfType: z.enum(['natural_grass', 'hybrid', 'artificial', 'sand_dressed']).optional(),
    grassSpecies: z.string().trim().max(80).optional(),
    drainageType: z.string().trim().max(80).optional(),
    status: z.enum(['active', 'maintenance', 'inactive', 'archived']).optional(),
    location: z.record(z.any()).optional(),
    address: addressSchema,
    dimensions: z.record(z.any()).optional(),
    gpsCoordinates: gpsSchema,
    photos: z.array(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const listFieldsSchema = paginationQuerySchema;
export const getFieldSchema = idParamSchema;
export const nearbyFieldsSchema = nearbyQuerySchema;