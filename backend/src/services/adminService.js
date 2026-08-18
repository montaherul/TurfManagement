import { prisma } from '../config/db.js';

const DEFAULT_SETTINGS = {
  platformFee: 15,
  smsProvider: '',
  refundNoticeHours: 24,
};

export const createAdminService = ({
  facilityService,
  userListRepository,
  systemSettingRepository,
  auditLogRepository,
}) => {
  const listFacilities = (params) => facilityService.listAll(params);

  const getFacility = (facilityId) => facilityService.getById(facilityId);

  const approveApplication = (params) => facilityService.approveApplication(params);

  const rejectApplication = (params) => facilityService.rejectApplication(params);

  const setFacilityStatus = (params) => facilityService.setStatus(params);

  const listCustomers = async ({ page, limit, search, sort }) => {
    const result = await userListRepository.list({
      page,
      limit,
      search,
      sort,
      filters: { role: 'booker' },
    });
    return result;
  };

  const feeSummary = async () => {
    const [total, byFacility, byDate] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: { in: ['VERIFIED', 'REFUNDED'] } },
        _sum: { platformFee: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['facilityId'],
        where: { status: { in: ['VERIFIED', 'REFUNDED'] } },
        _sum: { platformFee: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _sum: { platformFee: true },
        _count: true,
      }),
    ]);
    return {
      totalFees: total._sum.platformFee || 0,
      totalPayments: total._count,
      byFacility,
      byStatus: byDate,
    };
  };

  const getSettings = async () => {
    const keys = Object.keys(DEFAULT_SETTINGS);
    const rows = await Promise.all(keys.map((key) => systemSettingRepository.get(key)));
    const settings = {};
    keys.forEach((key, i) => {
      settings[key] = rows[i] ?? DEFAULT_SETTINGS[key];
    });
    return settings;
  };

  const setSettings = async ({ settings, actorId, ipAddress }) => {
    const updated = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (settings[key] !== undefined) {
        updated[key] = await systemSettingRepository.set(key, settings[key]);
      }
    }
    await auditLogRepository.create({
      userId: actorId,
      action: 'admin.settings.update',
      resource: 'settings',
      details: { keys: Object.keys(updated) },
      ipAddress: ipAddress || null,
    });
    return updated;
  };

  return {
    listFacilities,
    getFacility,
    approveApplication,
    rejectApplication,
    setFacilityStatus,
    listCustomers,
    feeSummary,
    getSettings,
    setSettings,
  };
};

export default createAdminService;