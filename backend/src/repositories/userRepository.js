import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const publicUserSelect = {
  id: true,
  facilityId: true,
  email: true,
  mobile: true,
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
  searchableFields: ['email', 'mobile', 'firstName', 'lastName'],
  filterMap: {
    role: 'role',
    facilityId: 'facilityId',
    isActive: { field: 'isActive', type: 'boolean' },
  },
  sortableFields: ['email', 'mobile', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt', 'lastLoginAt'],
  select: publicUserSelect,
});

export const userRepository = {
  ...createBaseRepository(prisma, 'User', { select: publicUserSelect }),

  findByIdWithHash: (id) =>
    prisma.user.findFirst({ where: { id }, select: authUserSelect }),

  findByEmail: (email) =>
    prisma.user.findFirst({ where: { email }, select: authUserSelect }),

  findByMobile: (mobile) =>
    prisma.user.findFirst({ where: { mobile }, select: authUserSelect }),

  findByEmailPublic: (email) =>
    prisma.user.findFirst({ where: { email }, select: publicUserSelect }),

  findByMobilePublic: (mobile) =>
    prisma.user.findFirst({ where: { mobile }, select: publicUserSelect }),
};

export default userRepository;