import { z } from 'zod';
import { paginationQuerySchema, idParamSchema } from './common.js';

const severityEnum = z.enum(['none', 'low', 'medium', 'high']).optional();

const surfaceAssessmentSchema = z
  .object({
    grassCoverPercent: z.number().min(0).max(100).optional(),
    colorUniformity: z.number().min(1).max(5).optional(),
    weedPresence: severityEnum,
    pestDamage: severityEnum,
    diseaseSigns: severityEnum,
    thatchBuildUp: severityEnum,
  })
  .optional();

const soilAssessmentSchema = z
  .object({
    moistureContent: z.number().min(0).max(100).optional(),
    compactionKgCm2: z.number().min(0).max(100).optional(),
    ph: z.number().min(0).max(14).optional(),
    drainageRateMinutes: z.number().min(0).optional(),
    organicMatterPercent: z.number().min(0).max(100).optional(),
  })
  .optional();

const structuralAssessmentSchema = z
  .object({
    surfaceEvennessMm: z.number().min(0).optional(),
    drainageRateMinutes: z.number().min(0).optional(),
    thatchDepthMm: z.number().min(0).optional(),
    slopeIssues: severityEnum,
    boundaryIssues: severityEnum,
  })
  .optional();

const grassHealthSchema = z
  .object({
    colorRating: z.number().min(1).max(5).optional(),
    densityRating: z.number().min(1).max(5).optional(),
    diseaseRating: z.number().min(1).max(5).optional(),
    pestRating: z.number().min(1).max(5).optional(),
    recoveryStatus: severityEnum,
  })
  .optional();

export const createInspectionSchema = z.object({
  body: z.object({
    fieldId: z.string().min(1, 'fieldId is required'),
    inspectionDate: z.string().datetime({ offset: true }).or(z.coerce.date()).optional(),
    weatherConditions: z.record(z.any()).optional(),
    surfaceAssessment: surfaceAssessmentSchema,
    soilAssessment: soilAssessmentSchema,
    structuralAssessment: structuralAssessmentSchema,
    grassHealth: grassHealthSchema,
    photographs: z.array(z.any()).optional(),
    recommendations: z.array(z.any()).or(z.record(z.any())).optional(),
  }),
});

export const updateInspectionSchema = z.object({
  body: createInspectionSchema.shape.body.partial(),
});

export const listInspectionsSchema = paginationQuerySchema;
export const getInspectionSchema = idParamSchema;