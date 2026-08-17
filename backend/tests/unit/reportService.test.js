import { createReportService } from '../../src/services/reportService.js';

const makeService = (analyticsOverrides = {}) => {
  const analyticsRepository = {
    dashboard: async (orgId) => ({ orgId, summary: { fields: 5, inspections: 12, workOrders: 3 } }),
    scoreTrends: async (orgId, fieldId) => {
      if (fieldId) return [{ fieldId, trend: [{ date: '2026-08-01', total: 70 }, { date: '2026-08-15', total: 75 }] }];
      return [{ fieldId: 'FLD-1', trend: [{ date: '2026-08-01', total: 70 }] }];
    },
    scoreDistribution: async (orgId) => [
      { tier: 'excellent', count: 2 },
      { tier: 'good', count: 5 },
      { tier: 'acceptable', count: 3 },
      { tier: 'poor', count: 2 },
    ],
    workOrderStatus: async (orgId) => [
      { status: 'created', count: 1 },
      { status: 'completed', count: 2 },
    ],
    maintenanceCosts: async (orgId) => [
      { month: '2026-07', amount: 15000 },
      { month: '2026-08', amount: 22000 },
    ],
    ...analyticsOverrides,
  };

  return { service: createReportService({ analyticsRepository }), analyticsRepository };
};

describe('createReportService', () => {
  describe('getAnalytics', () => {
    it('returns dashboard summary for the org', async () => {
      const { service } = makeService();
      const result = await service.getAnalytics('org-1');
      expect(result.orgId).toBe('org-1');
      expect(result.summary.fields).toBe(5);
    });
  });

  describe('getScoreTrends', () => {
    it('returns trends for all fields when fieldId is omitted', async () => {
      const { service } = makeService();
      const result = await service.getScoreTrends('org-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].fieldId).toBe('FLD-1');
    });

    it('filters trends by fieldId when provided', async () => {
      const { service } = makeService();
      const result = await service.getScoreTrends('org-1', 'FLD-1');
      expect(result[0].fieldId).toBe('FLD-1');
      expect(result[0].trend.length).toBe(2);
    });
  });

  describe('getScoreDistribution', () => {
    it('returns distribution plus tier counts', async () => {
      const { service } = makeService();
      const result = await service.getScoreDistribution('org-1');
      expect(result.distribution).toHaveLength(4);
      expect(result.tiers.excellent).toBe(2);
      expect(result.tiers.poor).toBe(2);
    });
  });

  describe('getWorkOrderStatus', () => {
    it('returns status breakdown', async () => {
      const { service } = makeService();
      const result = await service.getWorkOrderStatus('org-1');
      expect(result).toEqual([{ status: 'created', count: 1 }, { status: 'completed', count: 2 }]);
    });
  });

  describe('getMaintenanceCosts', () => {
    it('returns monthly cost data', async () => {
      const { service } = makeService();
      const result = await service.getMaintenanceCosts('org-1');
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(15000);
    });
  });
});
