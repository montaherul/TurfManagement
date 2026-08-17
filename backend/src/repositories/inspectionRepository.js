import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

const inspectionSelect = {
  id: true,
  organizationId: true,
  fieldId: true,
  inspectorId: true,
  inspectionDate: true,
  weatherConditions: true,
  surfaceAssessment: true,
  soilAssessment: true,
  structuralAssessment: true,
  grassHealth: true,
  photographs: true,
  pitchQualityScore: true,
  recommendations: true,
  status: true,
  verifiedBy: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
};

const inspectionDetailSelect = {
  ...inspectionSelect,
  field: { select: { id: true, fieldId: true, name: true } },
  inspector: { select: { id: true, firstName: true, lastName: true, email: true } },
  verifier: { select: { id: true, firstName: true, lastName: true, email: true } },
};

export const inspectionRepository = {
  /**
   * Paginated list via the fn_list_inspections stored procedure — one round
   * trip, ILIKE search on recommendations, filters, COUNT(*) OVER total.
   * Returns the same envelope shape as the generic paginated repository.
   */
  async list({ organizationId, page = 1, limit = 10, sort, search, filters = {} }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    let sortField = 'inspectionDate';
    let sortDir = 'desc';
    if (sort) {
      const [field, dir] = sort.split(':');
      if (field) sortField = field;
      if (dir === 'asc') sortDir = 'asc';
    }

    const scoreMin = Number(filters.pitchQualityScore__gte ?? filters.score__gte) || null;
    const scoreMax = Number(filters.pitchQualityScore__lte ?? filters.score__lte) || null;

    const rows = await prisma.$queryRaw`
      SELECT data::text AS data, total::bigint AS total
      FROM fn_list_inspections(
        ${organizationId}::text,
        ${pageNum}::int,
        ${limitNum}::int,
        ${sortField}::text,
        ${sortDir}::text,
        ${search || null}::text,
        ${filters.status || null}::text,
        ${filters.fieldId || null}::text,
        ${scoreMin}::numeric,
        ${scoreMax}::numeric
      )
    `;

    const raw = rows[0]?.data || '[]';
    let data = [];
    try {
      data = JSON.parse(raw);
    } catch {
      data = [];
    }
    const total = Number(rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  },

  ...createBaseRepository(prisma, 'Inspection', {
    select: inspectionSelect,
    detailSelect: inspectionDetailSelect,
  }),

  findByFieldLatest: (fieldId, organizationId) =>
    prisma.inspection.findFirst({
      where: { fieldId, organizationId, status: { in: ['submitted', 'verified'] } },
      orderBy: { inspectionDate: 'desc' },
      select: inspectionSelect,
    }),

  // Used by reportService for PDF generation (full relation graph)
  getWithRelations: (id) =>
    prisma.inspection.findFirst({
      where: { id },
      include: {
        field: true,
        inspector: { select: { id: true, firstName: true, lastName: true, email: true } },
        verifier: { select: { id: true, firstName: true, lastName: true, email: true } },
        organization: true,
      },
    }),
};

export default inspectionRepository;