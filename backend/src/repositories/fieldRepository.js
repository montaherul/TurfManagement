import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const fieldSelect = {
  id: true,
  organizationId: true,
  fieldId: true,
  name: true,
  sportType: true,
  turfType: true,
  grassSpecies: true,
  drainageType: true,
  status: true,
  location: true,
  address: true,
  dimensions: true,
  gpsCoordinates: true,
  photos: true,
  metadata: true,
  currentScore: true,
  createdAt: true,
  updatedAt: true,
};

export const fieldListRepository = createPaginatedRepository(prisma, 'Field', {
  searchableFields: ['name', 'fieldId', 'sportType'],
  filterMap: {
    sportType: 'sportType',
    turfType: 'turfType',
    grassSpecies: 'grassSpecies',
    drainageType: 'drainageType',
    status: 'status',
  },
  sortableFields: ['name', 'fieldId', 'sportType', 'status', 'createdAt', 'updatedAt'],
  select: fieldSelect,
});

export const fieldRepository = {
  ...createBaseRepository(prisma, 'Field', { select: fieldSelect }),

  findNearbyCandidates: ({ organizationId, latMin, latMax, lngMin, lngMax }) =>
    prisma.$queryRaw`
      SELECT * FROM "Field"
      WHERE "organizationId" = ${organizationId}
        AND ("gpsCoordinates"->>'lat')::numeric BETWEEN ${latMin} AND ${latMax}
        AND ("gpsCoordinates"->>'lng')::numeric BETWEEN ${lngMin} AND ${lngMax}
    `,

  findByIdentifier: ({ organizationId, fieldId }) =>
    prisma.field.findFirst({
      where: { organizationId, fieldId },
      select: fieldSelect,
    }),
};

export default fieldRepository;