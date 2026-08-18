import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const resourceSelect = {
  id: true,
  facilityId: true,
  name: true,
  type: true,
  capacity: true,
  basePrice: true,
  status: true,
  scheduleTemplate: true,
  createdAt: true,
  updatedAt: true,
};

export const resourceListRepository = createPaginatedRepository(prisma, 'Resource', {
  searchableFields: ['name'],
  filterMap: {
    type: 'type',
    status: 'status',
    facilityId: 'facilityId',
  },
  sortableFields: ['name', 'type', 'basePrice', 'status', 'createdAt', 'updatedAt'],
  select: resourceSelect,
});

export const resourceRepository = {
  ...createBaseRepository(prisma, 'Resource', { select: resourceSelect }),

  findByFacility: (facilityId) =>
    prisma.resource.findMany({ where: { facilityId }, orderBy: { name: 'asc' }, select: resourceSelect }),

  listPublicByFacility: (facilityId) =>
    prisma.resource.findMany({
      where: { facilityId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: resourceSelect,
    }),
};

export default resourceRepository;