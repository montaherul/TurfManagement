import crypto from 'crypto';
import { AppError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/auth.js';

const PUBLIC_STATUSES = ['APPROVED', 'ACTIVE'];

export const createFacilityService = ({
  facilityRepository,
  facilityListRepository,
  resourceRepository,
  userRepository,
  auditLogRepository,
  notificationService,
}) => {
  const searchPublic = async ({ search, type, page, limit }) => {
    const filters = { status: { in: PUBLIC_STATUSES } };
    const extraWhere = {};
    if (type) {
      extraWhere.resources = { some: { type, status: 'ACTIVE' } };
    }
    const result = await facilityListRepository.list({
      page,
      limit,
      search,
      filters,
      extraWhere,
    });
    const types = await Promise.all(
      result.data.map(async (f) => {
        const resources = await resourceRepository.findByFacility(f.id);
        return {
          ...f,
          resourceTypes: [...new Set(resources.filter((r) => r.status === 'ACTIVE').map((r) => r.type))],
          resourceCount: resources.filter((r) => r.status === 'ACTIVE').length,
        };
      })
    );
    return { ...result, data: types };
  };

  const getPublicBySlug = async (slug) => {
    const facility = await facilityRepository.findBySlug(slug);
    if (!facility || !PUBLIC_STATUSES.includes(facility.status)) {
      throw new AppError(404, 'Facility not found', { code: 'NOT_FOUND' });
    }
    const resources = await resourceRepository.listPublicByFacility(facility.id);
    return { ...facility, resources };
  };

  const getMine = async (facilityId) => {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, 'Facility not found', { code: 'NOT_FOUND' });
    }
    const resources = await resourceRepository.findByFacility(facilityId);
    return { ...facility, resources };
  };

  const updateProfile = async (facilityId, data) => {
    const allowed = [
      'name', 'phone', 'email', 'address', 'facebookUrl', 'bkashNumber',
      'nagadNumber', 'operatingHours', 'description', 'gallery',
      'cancellationPolicy', 'logo', 'coverPhoto',
    ];
    const payload = {};
    for (const key of allowed) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (data.name) {
      const slug = facilityRepository.createSlug(data.name);
      const existing = await facilityRepository.findFirst({ slug, id: { not: facilityId } });
      if (!existing) payload.slug = slug;
    }
    const facility = await facilityRepository.update(facilityId, payload);
    await auditLogRepository.create({
      facilityId,
      userId: data.actorId || null,
      action: 'facility.update',
      resource: 'facility',
      resourceId: facilityId,
      details: { fields: Object.keys(payload) },
      ipAddress: data.ipAddress || null,
    });
    return facility;
  };

  const listAll = (params) =>
    facilityListRepository.list({
      page: params.page,
      limit: params.limit,
      search: params.search,
      filters: { status: params.status },
      sort: params.sort,
    });

  const getById = async (facilityId) => {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, 'Facility not found', { code: 'NOT_FOUND' });
    }
    return facility;
  };

  /**
   * Approves a pending application: creates the facility owner account with a
   * temporary password and emails the credentials (per spec §4.2).
   */
  const approveApplication = async ({ facilityId, actorId, ipAddress }) => {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, 'Facility not found', { code: 'NOT_FOUND' });
    }
    if (facility.status !== 'PENDING') {
      throw new AppError(422, 'Only pending applications can be approved', { code: 'VALIDATION_ERROR' });
    }

    const application = facility.application || {};
    const ownerEmail = application.ownerEmail;
    if (!ownerEmail) {
      throw new AppError(422, 'Application has no owner email', { code: 'VALIDATION_ERROR' });
    }

    const tempPassword = cryptoRandomPassword();
    const passwordHash = await hashPassword(tempPassword);

    let owner = await userRepository.findByEmailPublic(ownerEmail);
    if (owner) {
      await userRepository.update(owner.id, {
        role: 'facility_owner',
        facilityId,
        isActive: true,
        passwordHash,
        notificationPreferences: { email: true, inApp: true, sms: false },
      });
    } else {
      owner = await userRepository.create({
        email: ownerEmail,
        mobile: null,
        passwordHash,
        firstName: application.ownerName || null,
        lastName: null,
        role: 'facility_owner',
        facilityId,
        isActive: true,
        notificationPreferences: { email: true, inApp: true, sms: false },
      });
    }

    const updated = await facilityRepository.update(facilityId, {
      status: 'ACTIVE',
      application: {
        ...application,
        reviewedBy: actorId,
        reviewedAt: new Date().toISOString(),
        rejectionReason: null,
      },
    });

    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'facility.approve',
      resource: 'facility',
      resourceId: facilityId,
      ipAddress: ipAddress || null,
    });

    await notificationService.notifyUser(owner.id, 'facility:approved', {
      facilityId,
      facilityName: facility.name,
      loginEmail: ownerEmail,
      temporaryPassword: tempPassword,
    });
    await notificationService.notifyFacility(facilityId, 'facility:approved', {
      facilityId,
      facilityName: facility.name,
    });

    return { facility: updated, ownerEmail, temporaryPassword: tempPassword };
  };

  const rejectApplication = async ({ facilityId, reason, actorId, ipAddress }) => {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, 'Facility not found', { code: 'NOT_FOUND' });
    }
    if (facility.status !== 'PENDING') {
      throw new AppError(422, 'Only pending applications can be rejected', { code: 'VALIDATION_ERROR' });
    }
    const updated = await facilityRepository.update(facilityId, {
      status: 'REJECTED',
      application: {
        ...(facility.application || {}),
        reviewedBy: actorId,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason || null,
      },
    });
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'facility.reject',
      resource: 'facility',
      resourceId: facilityId,
      details: { reason },
      ipAddress: ipAddress || null,
    });
    return updated;
  };

  const setStatus = async ({ facilityId, status, actorId, ipAddress }) => {
    const valid = ['ACTIVE', 'SUSPENDED'];
    if (!valid.includes(status)) {
      throw new AppError(422, `Invalid status: ${status}`, { code: 'VALIDATION_ERROR' });
    }
    const facility = await facilityRepository.update(facilityId, { status });
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'facility.status',
      resource: 'facility',
      resourceId: facilityId,
      details: { status },
      ipAddress: ipAddress || null,
    });
    return facility;
  };

  return {
    searchPublic,
    getPublicBySlug,
    getMine,
    updateProfile,
    listAll,
    getById,
    approveApplication,
    rejectApplication,
    setStatus,
  };
};

const cryptoRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let result = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

export default createFacilityService;