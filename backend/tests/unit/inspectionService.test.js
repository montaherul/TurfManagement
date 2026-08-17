import { createInspectionService } from '../../src/services/inspectionService.js';

const makeService = ({ orgSettings = {} } = {}) => {
  const inspectionRepo = {
    findById: async (id) => (id === 'insp-1' ? { id, status: 'draft', fieldId: 'field-1' } : null),
    create: async (data) => ({ ...data, id: 'insp-1' }),
    update: async (id, data) => ({ id, ...data }),
  };
  const fieldRepo = {
    findById: async (id) => ({ id, name: 'Field A' }),
    update: async () => {},
  };
  const organizationRepo = {
    findById: async () => ({ id: 'org-1', settings: orgSettings }),
  };
  const planLimitService = {
    assertWithinLimits: async () => {},
  };
  return createInspectionService({
    inspectionRepository: inspectionRepo,
    fieldRepository: fieldRepo,
    organizationRepository: organizationRepo,
    workOrderService: {
      createFromInspection: async () => null,
    },
    notificationService: {},
    auditLogRepository: { create: async () => {} },
    planLimitService,
  });
};

const assessmentData = {
  fieldId: 'field-1',
  surfaceAssessment: {
    grassCoverPercent: 100,
    colorUniformity: 5,
    weedPresence: 'none',
    pestDamage: 'none',
    diseaseSigns: 'none',
  },
  soilAssessment: { moistureContent: 40, compactionKgCm2: 0, ph: 7 },
  structuralAssessment: { surfaceEvennessMm: 0, drainageRateMinutes: 0, thatchDepthMm: 0 },
  grassHealth: { colorRating: 5, diseaseRating: 1, pestRating: 1 },
};

describe('inspectionService scoring with organization weights', () => {
  it('uses the default weights when the organization has no override', async () => {
    const service = makeService({ orgSettings: {} });
    const result = await service.create({ organizationId: 'org-1', actorId: 'user-1', ...assessmentData });
    expect(result.inspection.pitchQualityScore.total).toBe(95);
  });

  it('applies the organization scoring weights to the total', async () => {
    const service = makeService({
      orgSettings: { scoringWeights: { surface: 10, soil: 10, structural: 10, grass: 10, maintenance: 10 } },
    });
    const result = await service.create({ organizationId: 'org-1', actorId: 'user-1', ...assessmentData });
    const score = result.inspection.pitchQualityScore;
    expect(score.surfaceScore).toBe(10);
    expect(score.total).toBeLessThanOrEqual(50);
  });

  it('still derives a work order for poor tiers after rescoring', async () => {
    const workOrders = [];
    const service = makeService({ orgSettings: {} });
    const original = service.create;
    service.create = async (input) => {
      const result = await original(input);
      workOrders.push(result.workOrder);
      return result;
    };
    const poor = {
      ...assessmentData,
      surfaceAssessment: { grassCoverPercent: 30, colorUniformity: 1, weedPresence: 'high', pestDamage: 'high', diseaseSigns: 'high' },
      soilAssessment: { moistureContent: 90, compactionKgCm2: 30, ph: 9 },
      structuralAssessment: { surfaceEvennessMm: 18, drainageRateMinutes: 45, thatchDepthMm: 9 },
      grassHealth: { colorRating: 1, diseaseRating: 5, pestRating: 5 },
    };
    await service.create({ organizationId: 'org-1', actorId: 'user-1', ...poor });
    expect(workOrders).toHaveLength(1);
  });
});
