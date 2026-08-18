import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

export const auditLogListRepository = createPaginatedRepository(prisma, 'AuditLog', {
  searchableFields: ['action', 'resource'],
  filterMap: {
    facilityId: 'facilityId',
    userId: 'userId',
    action: 'action',
    resource: 'resource',
    resourceId: 'resourceId',
  },
  sortableFields: ['action', 'resource', 'createdAt'],
  select: {
    id: true,
    facilityId: true,
    userId: true,
    action: true,
    resource: true,
    resourceId: true,
    details: true,
    ipAddress: true,
    createdAt: true,
  },
});

export const auditLogRepository = createBaseRepository(prisma, 'AuditLog');

export default auditLogRepository;