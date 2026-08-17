import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const publicUserSelect = {
  id: true,
  organizationId: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  profilePhoto: true,
  notificationPreferences: true,
  createdAt: true,
  updatedAt: true,
};

const authUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
};

export const userListRepository = createPaginatedRepository(prisma, 'User', {
  searchableFields: ['email', 'firstName', 'lastName'],
  filterMap: {
    role: 'role',
    organizationId: 'organizationId',
    isActive: { field: 'isActive', type: 'boolean' },
  },
  sortableFields: ['email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt', 'lastLoginAt'],
  select: publicUserSelect,
});

export const userRepository = {
  ...createBaseRepository(prisma, 'User', { select: publicUserSelect }),

  findByIdWithHash: (id) =>
    prisma.user.findFirst({ where: { id }, select: authUserSelect }),

  findByEmail: (email) =>
    prisma.user.findFirst({ where: { email }, select: authUserSelect }),

  findByEmailPublic: (email) =>
    prisma.user.findFirst({ where: { email }, select: publicUserSelect }),
};

export default userRepository;