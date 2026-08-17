import { AppError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/auth.js';

const ROLES = ['super_admin', 'org_admin', 'inspector', 'viewer'];

export const createAdminService = ({
  userRepository,
  userListRepository,
  fieldListRepository,
  organizationRepository,
  organizationListRepository,
  auditLogRepository,
  auditLogListRepository,
  planLimitService,
}) => {
  const getSystemHealth = async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV,
    };
  };

  const listUsers = (params) => userListRepository.list(params);

  /**
   * Creates a user. org_admins can only create within their own organization
   * (plan limit enforced). super_admins can target any organization.
   */
  const createUser = async ({ actorRole, actorOrganizationId, data, ipAddress }) => {
    const role = data.role || 'inspector';
    if (!ROLES.includes(role)) {
      throw new AppError(422, `Invalid role: ${role}`, { code: 'INVALID_ROLE' });
    }
    if (role === 'super_admin' && actorRole !== 'super_admin') {
      throw new AppError(403, 'Only super admins can create super admins', { code: 'FORBIDDEN' });
    }

    const organizationId = actorRole === 'super_admin'
      ? data.organizationId || null
      : actorOrganizationId;

    if (organizationId) {
      await planLimitService.assertWithinLimits(organizationId, 'users');
      const org = await organizationRepository.findById(organizationId);
      if (!org) {
        throw new AppError(404, 'Organization not found', { code: 'NOT_FOUND' });
      }
    }

    const existing = await userRepository.findByEmailPublic(data.email);
    if (existing) {
      throw new AppError(409, 'User with this email already exists', { code: 'EMAIL_TAKEN' });
    }

    const passwordHash = await hashPassword(data.password || 'Password123!');
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role,
      organizationId,
      isActive: data.isActive !== false,
      notificationPreferences: { email: true, inApp: true, sms: false },
    });

    await auditLogRepository.create({
      organizationId,
      userId: data.actorId || null,
      action: 'user.create',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: ipAddress || null,
    });

    return user;
  };

  const listFields = (params) => fieldListRepository.list(params);

  const listAuditLogs = (params) => auditLogListRepository.list(params);

  const listOrganizations = (params) => organizationListRepository.list(params);

  const getOrganization = async (id) => {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError(404, 'Organization not found', { code: 'NOT_FOUND' });
    }
    return org;
  };

  const updateOrganization = async (id, data) => {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError(404, 'Organization not found', { code: 'NOT_FOUND' });
    }
    return organizationRepository.update(id, data);
  };

  const suspendOrganization = async (id, { suspended }) => {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError(404, 'Organization not found', { code: 'NOT_FOUND' });
    }
    const settings = { ...(org.settings || {}), suspended: Boolean(suspended) };
    await organizationRepository.update(id, { settings });
    return { ...org, settings };
  };

  return {
    getSystemHealth,
    listUsers,
    createUser,
    listFields,
    listAuditLogs,
    listOrganizations,
    getOrganization,
    updateOrganization,
    suspendOrganization,
  };
};

export default createAdminService;