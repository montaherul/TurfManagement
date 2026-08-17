import { prisma } from '../config/db.js';

/**
 * Analytics repository — the ONLY place that calls the stored procedures.
 * JSONB results are cast to text and parsed here so the service layer always
 * receives plain JS objects regardless of the pg driver's JSONB mapping.
 */
export const analyticsRepository = {
  dashboard: async (organizationId) => {
    const rows = await prisma.$queryRaw`
      SELECT fn_analytics_dashboard(${organizationId})::text AS result
    `;
    return JSON.parse(rows[0]?.result || '{}');
  },

  scoreTrends: async (organizationId, fieldId = null) => {
    const rows = await prisma.$queryRaw`
      SELECT month, avg_score::float AS avg_score, count::int AS count
      FROM fn_analytics_score_trends(${organizationId}, ${fieldId || null})
    `;
    return rows.map((r) => ({
      month: r.month,
      avgScore: r.avg_score,
      count: r.count,
    }));
  },

  scoreDistribution: async (organizationId) => {
    const rows = await prisma.$queryRaw`
      SELECT bucket, count::int AS count, tier
      FROM fn_analytics_score_distribution(${organizationId})
    `;
    return rows.map((r) => ({ bucket: r.bucket, count: r.count, tier: r.tier }));
  },

  workOrderStatus: async (organizationId) => {
    const rows = await prisma.$queryRaw`
      SELECT status, count::int AS count
      FROM fn_analytics_workorder_status(${organizationId})
    `;
    return rows.map((r) => ({ status: r.status, count: r.count }));
  },

  maintenanceCosts: async (organizationId) => {
    const rows = await prisma.$queryRaw`
      SELECT month, estimated_total::float AS estimated_total, actual_total::float AS actual_total
      FROM fn_analytics_maintenance_costs(${organizationId})
    `;
    return rows.map((r) => ({
      month: r.month,
      estimatedTotal: r.estimated_total,
      actualTotal: r.actual_total,
    }));
  },
};

export default analyticsRepository;