import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

const slotSelect = {
  id: true,
  facilityId: true,
  resourceId: true,
  date: true,
  startTime: true,
  endTime: true,
  price: true,
  isPeak: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const slotRepository = {
  ...createBaseRepository(prisma, 'Slot', { select: slotSelect }),

  findForResourceAndDate: (resourceId, date) =>
    prisma.slot.findMany({
      where: { resourceId, date },
      orderBy: { startTime: 'asc' },
      select: slotSelect,
    }),

  findAvailableByResourceAndDate: (resourceId, date) =>
    prisma.slot.findMany({
      where: { resourceId, date, status: 'AVAILABLE' },
      orderBy: { startTime: 'asc' },
      select: slotSelect,
    }),

  findByIds: (ids) =>
    prisma.slot.findMany({ where: { id: { in: ids } }, select: slotSelect }),

  countByDate: (date) =>
    prisma.slot.count({ where: { date } }),

  createMany: (rows) =>
    prisma.slot.createMany({ data: rows, skipDuplicates: true }),

  blockSlot: (id) =>
    prisma.slot.update({ where: { id }, data: { status: 'BLOCKED' } }),

  releaseSlot: (id) =>
    prisma.slot.update({ where: { id }, data: { status: 'AVAILABLE' } }),
};

export default slotRepository;