import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

const scheduledReportSelect = {
  id: true,
  organizationId: true,
  frequency: true,
  recipients: true,
  enabled: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
};

export const scheduledReportRepository = {
  ...createBaseRepository(prisma, 'ScheduledReport', { select: scheduledReportSelect }),

  listByOrganization: (organizationId) =>
    prisma.scheduledReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: scheduledReportSelect,
    }),

  listEnabled: () =>
    prisma.scheduledReport.findMany({
      where: { enabled: true },
      select: scheduledReportSelect,
    }),

  upsertForOrganization: async (organizationId, id, data) => {
    if (id) {
      const existing = await prisma.scheduledReport.findFirst({
        where: { id, organizationId },
        select: { id: true },
      });
      if (existing) {
        return prisma.scheduledReport.update({
          where: { id },
          data,
          select: scheduledReportSelect,
        });
      }
    }
    return prisma.scheduledReport.create({
      data: { ...data, organizationId },
      select: scheduledReportSelect,
    });
  },

  deleteForOrganization: async (id, organizationId) => {
    const existing = await prisma.scheduledReport.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) return false;
    await prisma.scheduledReport.delete({ where: { id } });
    return true;
  },
};

export default scheduledReportRepository;