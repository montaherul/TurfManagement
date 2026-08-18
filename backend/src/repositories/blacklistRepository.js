import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const blacklistSelect = {
  id: true,
  facilityId: true,
  customerId: true,
  teamName: true,
  category: true,
  reason: true,
  addedBy: true,
  createdAt: true,
};

export const blacklistListRepository = createPaginatedRepository(prisma, 'Blacklist', {
  searchableFields: ['teamName', 'reason'],
  filterMap: {
    category: 'category',
    facilityId: 'facilityId',
    customerId: 'customerId',
  },
  sortableFields: ['category', 'createdAt'],
  select: blacklistSelect,
});

export const blacklistRepository = {
  ...createBaseRepository(prisma, 'Blacklist', { select: blacklistSelect }),

  findForCustomer: (facilityId, customerId) =>
    prisma.blacklist.findFirst({ where: { facilityId, customerId }, select: blacklistSelect }),

  listForFacility: (facilityId) =>
    prisma.blacklist.findMany({
      where: { facilityId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...blacklistSelect,
        customer: { select: { id: true, firstName: true, lastName: true, mobile: true } },
      },
    }),
};

export default blacklistRepository;