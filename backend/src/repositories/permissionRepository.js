import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

export const rolePermissionRepository = createBaseRepository(prisma, 'rolePermission', {});

export const userPermissionRepository = createBaseRepository(prisma, 'userPermission', {});