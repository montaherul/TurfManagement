import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

export const auditLogListRepository = createPaginatedRepository(prisma, 'AuditLog', {
  searchableFields: ['action', 'resource'],
  filterMap: {
    organizationId: 'organizationId',
    userId: 'userId',
    action: 'action',
    resource: 'resource',
    resourceId: 'resourceId',
  },
  sortableFields: ['action', 'resource', 'createdAt'],
  select: {
    id: true,
    organizationId: true,
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