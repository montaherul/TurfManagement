import { createWorkOrderService } from '../../src/services/workOrderService.js';

const makeService = (overrides = {}) => {
  const created = [];
  const repo = {
    create: async (data) => {
      const record = { ...data, id: 'wo-1' };
      created.push(record);
      return record;
    },
    ...overrides,
  };
  const notificationService = {
    notifyOrganization: async () => {},
  };
  return {
    service: createWorkOrderService({
      workOrderRepository: repo,
      workOrderListRepository: { list: async () => ({ rows: [], meta: {} }) },
      fieldRepository: {},
      userRepository: {},
      notificationService,
      auditLogRepository: { create: async () => {} },
    }),
    created,
  };
};

const makeInspection = (overrides = {}) => ({
  id: 'insp-1',
  fieldId: 'field-1',
  pitchQualityScore: { total: 40, tier: 'poor' },
  surfaceAssessment: {},
  soilAssessment: {},
  structuralAssessment: {},
  grassHealth: {},
  ...overrides,
});

describe('createFromInspection', () => {
  it('returns null when the tier is good or better', async () => {
    const { service } = makeService();
    const result = await service.createFromInspection({
      organizationId: 'org-1',
      actorId: 'user-1',
      inspection: makeInspection({ pitchQualityScore: { total: 90, tier: 'good' } }),
    });
    expect(result).toBeNull();
  });

  it('derives a drainage task when drainage is slow', async () => {
    const { service, created } = makeService();
    await service.createFromInspection({
      organizationId: 'org-1',
      actorId: 'user-1',
      inspection: makeInspection({
        structuralAssessment: { drainageRateMinutes: 45, surfaceEvennessMm: 2, thatchDepthMm: 2 },
      }),
    });
    const tasks = created[0].tasks;
    expect(tasks.some((t) => t.category === 'drainage')).toBe(true);
    expect(created[0].estimatedCost.amount).toBeGreaterThanOrEqual(5000);
  });

  it('derives tasks for every finding type present', async () => {
    const { service, created } = makeService();
    await service.createFromInspection({
      organizationId: 'org-1',
      actorId: 'user-1',
      inspection: makeInspection({
        surfaceAssessment: {
          grassCoverPercent: 40,
          weedPresence: 'high',
          pestDamage: 'medium',
          diseaseSigns: 'medium',
        },
        soilAssessment: { compactionKgCm2: 25, moistureContent: 15 },
        structuralAssessment: { surfaceEvennessMm: 15, drainageRateMinutes: 30, thatchDepthMm: 18 },
        grassHealth: { colorRating: 2, diseaseRating: 4, pestRating: 3 },
      }),
    });
    const categories = created[0].tasks.map((t) => t.category);
    for (const expected of ['drainage', 'aeration', 'thatching', 'leveling', 'overseeding', 'weed_control', 'pest_control', 'disease_treatment', 'irrigation']) {
      expect(categories).toContain(expected);
    }
  });

  it('falls back to a generic task when no specific findings exist', async () => {
    const { service, created } = makeService();
    await service.createFromInspection({
      organizationId: 'org-1',
      actorId: 'user-1',
      inspection: makeInspection({
        surfaceAssessment: { grassCoverPercent: 90, weedPresence: 'low', pestDamage: 'low', diseaseSigns: 'low' },
        soilAssessment: { compactionKgCm2: 5, moistureContent: 50 },
        structuralAssessment: { surfaceEvennessMm: 2, drainageRateMinutes: 5, thatchDepthMm: 2 },
        grassHealth: { colorRating: 3, diseaseRating: 2, pestRating: 2 },
      }),
    });
    expect(created[0].tasks).toHaveLength(1);
    expect(created[0].tasks[0].category).toBe('other');
  });

  it('estimates cost from task hours with a minimum floor', async () => {
    const { service, created } = makeService();
    await service.createFromInspection({
      organizationId: 'org-1',
      actorId: 'user-1',
      inspection: makeInspection({
        soilAssessment: { compactionKgCm2: 25 },
        structuralAssessment: { drainageRateMinutes: 30 },
      }),
    });
    expect(created[0].estimatedCost.currency).toBe('BDT');
    expect(created[0].estimatedCost.amount).toBe(created[0].tasks.reduce((s, t) => s + t.estimatedHours, 0) * 800);
  });

  it('sets urgent priority and a short due date for poor tiers', async () => {
    const { service, created } = makeService();
    await service.createFromInspection({
      organizationId: 'org-1',
      actorId: 'user-1',
      inspection: makeInspection(),
    });
    expect(created[0].priority).toBe('urgent');
    expect(created[0].dueDate.getTime() - Date.now()).toBeLessThan(4 * 24 * 60 * 60 * 1000);
  });
});
