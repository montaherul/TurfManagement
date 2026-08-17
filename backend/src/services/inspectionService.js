import { AppError } from '../utils/ApiError.js';
import { calculatePitchQualityScore } from '../utils/scoring.js';

export const createInspectionService = ({
  inspectionRepository,
  fieldRepository,
  workOrderService,
  notificationService,
  auditLogRepository,
  planLimitService,
  organizationRepository,
}) => {
  const list = (params) => inspectionRepository.list(params);

  const getById = async (id) => {
    const inspection = await inspectionRepository.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found', { code: 'NOT_FOUND' });
    }
    return inspection;
  };

  const computeScore = async (data, organizationId) => {
    let weights;
    if (organizationId) {
      try {
        const organization = await organizationRepository.findById(organizationId);
        weights = organization?.settings?.scoringWeights;
      } catch (error) {
        weights = null;
      }
    }
    return calculatePitchQualityScore(data, weights);
  };

  const create = async ({ organizationId, actorId, ipAddress, ...data }) => {
    await planLimitService.assertWithinLimits(organizationId, 'inspections');

    const field = await fieldRepository.findById(data.fieldId);
    if (!field) {
      throw new AppError(404, 'Field not found', { code: 'NOT_FOUND' });
    }

    const score = await computeScore(data, organizationId);
    const inspection = await inspectionRepository.create({
      ...data,
      organizationId,
      inspectorId: data.inspectorId || actorId,
      status: 'draft',
      inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : new Date(),
      pitchQualityScore: score,
    });

    await fieldRepository.update(field.id, {
      currentScore: {
        total: score.total,
        tier: score.tier,
        lastInspectionDate: inspection.inspectionDate,
        inspectionId: inspection.id,
      },
    });

    await auditLogRepository.create({
      organizationId,
      userId: actorId,
      action: 'inspection.create',
      resource: 'inspection',
      resourceId: inspection.id,
      details: { fieldId: field.id, score: score.total, tier: score.tier },
      ipAddress: ipAddress || null,
    });

    let workOrder = null;
    if (score.tier === 'poor' || score.tier === 'acceptable') {
      workOrder = await workOrderService.createFromInspection({
        organizationId,
        actorId,
        inspection,
      });
    }

    return { inspection, workOrder };
  };

  const update = async (id, data, _organizationId) => {
    const inspection = await inspectionRepository.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found', { code: 'NOT_FOUND' });
    }
    if (inspection.status !== 'draft') {
      throw new AppError(400, 'Only draft inspections can be edited', { code: 'INSPECTION_LOCKED' });
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.inspectorId;
    delete updateData.status;
    if (updateData.inspectionDate) updateData.inspectionDate = new Date(updateData.inspectionDate);

    const merged = {
      ...inspection,
      ...updateData,
      surfaceAssessment: updateData.surfaceAssessment || inspection.surfaceAssessment,
      soilAssessment: updateData.soilAssessment || inspection.soilAssessment,
      structuralAssessment: updateData.structuralAssessment || inspection.structuralAssessment,
      grassHealth: updateData.grassHealth || inspection.grassHealth,
    };
    updateData.pitchQualityScore = await computeScore(merged, _organizationId);

    return inspectionRepository.update(id, updateData);
  };

  const submit = async (id, organizationId, actorId) => {
    const inspection = await inspectionRepository.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found', { code: 'NOT_FOUND' });
    }
    if (inspection.status !== 'draft') {
      throw new AppError(400, 'Inspection has already been submitted', { code: 'INSPECTION_NOT_DRAFT' });
    }

    const updated = await inspectionRepository.update(id, { status: 'submitted' });

    await auditLogRepository.create({
      organizationId,
      userId: actorId,
      action: 'inspection.submit',
      resource: 'inspection',
      resourceId: id,
      details: { fieldId: inspection.fieldId },
    });

    return updated;
  };

  const verify = async (id, organizationId, actorId) => {
    const inspection = await inspectionRepository.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found', { code: 'NOT_FOUND' });
    }
    if (inspection.status !== 'submitted') {
      throw new AppError(400, 'Inspection is not ready for verification', { code: 'INSPECTION_NOT_SUBMITTED' });
    }

    const updated = await inspectionRepository.update(id, {
      status: 'verified',
      verifiedBy: actorId,
      verifiedAt: new Date(),
    });

    await auditLogRepository.create({
      organizationId,
      userId: actorId,
      action: 'inspection.verify',
      resource: 'inspection',
      resourceId: id,
      details: { fieldId: inspection.fieldId, score: inspection.pitchQualityScore?.total },
    });

    await notificationService.notifyOrganization(
      organizationId,
      'inspection:verified',
      {
        inspectionId: updated.id,
        fieldId: updated.fieldId,
        score: updated.pitchQualityScore?.total,
        tier: updated.pitchQualityScore?.tier,
        verifiedBy: actorId,
      },
      { actorId, ipAddress: null, action: 'inspection.verified' }
    );

    return updated;
  };

  const getPdfData = async (id) => {
    const inspection = await inspectionRepository.getWithRelations(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found', { code: 'NOT_FOUND' });
    }
    return inspection;
  };

  const remove = async (id, organizationId) => {
    const inspection = await inspectionRepository.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found', { code: 'NOT_FOUND' });
    }

    await inspectionRepository.delete(id);

    await auditLogRepository.create({
      organizationId,
      userId: null,
      action: 'inspection.delete',
      resource: 'inspection',
      resourceId: id,
      details: { fieldId: inspection.fieldId, score: inspection.pitchQualityScore?.total },
      ipAddress: null,
    });

    return inspection;
  };

  return { list, getById, create, update, submit, verify, remove, getPdfData, computeScore };
};

export default createInspectionService;