import {
  PERMISSION_CATALOG,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES,
  permissionGroups,
} from '../config/permissions.js';
import { AppError } from '../utils/ApiError.js';

const CACHE_TTL_MS = 30 * 1000;

/**
 * Permission resolution:
 *   defaults -> platform role rows (orgId null) -> org role rows -> per-user override
 * super_admin always has every action (platform operators must never lock themselves out).
 */
export const createPermissionService = ({
  rolePermissionRepository,
  userPermissionRepository,
  userRepository,
  userListRepository,
  auditLogRepository,
}) => {
  const permissionCache = new Map();

  const invalidateUser = (userId) => {
    if (userId) permissionCache.delete(userId);
  };

  const cacheUser = (userId, perms) => {
    permissionCache.set(userId, { perms, expiresAt: Date.now() + CACHE_TTL_MS });
  };

  const getCachedUser = (userId) => {
    const entry = permissionCache.get(userId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      permissionCache.delete(userId);
      return null;
    }
    return entry.perms;
  };

  const buildEffectivePermissions = async (user) => {
    if (user.role === 'super_admin') {
      return new Set(PERMISSION_CATALOG.map((p) => p.action));
    }

    const [userOverrides, orgRows, platformRows] = await Promise.all([
      userPermissionRepository.findMany({ userId: userIdOf(user) }),
      rolePermissionRepository.findMany({ role: user.role, organizationId: user.organizationId }),
      rolePermissionRepository.findMany({ role: user.role, organizationId: null }),
    ]);

    // Org config replaces platform config; platform config replaces defaults.
    // Empty (unconfigured) falls back to the built-in defaults.
    let effective;
    if (orgRows.length) {
      effective = new Set(orgRows.map((row) => row.action));
    } else if (platformRows.length) {
      effective = new Set(platformRows.map((row) => row.action));
    } else {
      effective = new Set(DEFAULT_ROLE_PERMISSIONS[user.role] || []);
    }

    userOverrides.forEach((row) => {
      if (row.allowed) effective.add(row.action);
      else effective.delete(row.action);
    });
    return effective;
  };

  const userIdOf = (user) => user.userId || user.id;

  const resolvePermissions = async (user) => {
    const userId = userIdOf(user);
    if (!userId) return new Set();
    const cached = getCachedUser(userId);
    if (cached) return cached;
    const perms = await buildEffectivePermissions(user);
    cacheUser(userId, perms);
    return perms;
  };

  const hasPermission = async (user, action) => (await resolvePermissions(user)).has(action);

  const hasAnyPermission = async (user, actions) => {
    const perms = await resolvePermissions(user);
    return actions.some((a) => perms.has(a));
  };

  const getCatalog = () => ({
    catalog: PERMISSION_CATALOG,
    groups: permissionGroups(),
    roles: ROLES,
  });

  const getMyPermissions = async (user) => {
    const perms = await resolvePermissions(user);
    return { actions: [...perms].sort() };
  };

  const roleConfigFromRows = (rows, role) => {
    if (rows.length) {
      return { role, actions: rows.map((r) => r.action).sort() };
    }
    return { role, actions: [...(DEFAULT_ROLE_PERMISSIONS[role] || [])].sort() };
  };

  const listRolePermissions = async ({ organizationId = null } = {}) => {
    const rows = await rolePermissionRepository.findMany({ organizationId });
    return ROLES.map((role) => roleConfigFromRows(rows, role));
  };

  const validateActions = (actions) => {
    const catalog = new Set(PERMISSION_CATALOG.map((p) => p.action));
    const clean = [...new Set(actions || [])].filter((a) => catalog.has(a));
    return clean;
  };

  const syncRolePermissions = async ({
    role,
    actions,
    organizationId = null,
    actorId,
    organizationIdForAudit,
    ipAddress,
  }) => {
    if (!ROLES.includes(role)) {
      throw new AppError(422, `Invalid role: ${role}`, { code: 'VALIDATION_ERROR' });
    }
    const cleanActions = validateActions(actions);
    await rolePermissionRepository.deleteMany({ role, organizationId });
    for (const action of cleanActions) {
      await rolePermissionRepository.create({ role, action, organizationId });
    }
    await auditLogRepository.create({
      organizationId: organizationIdForAudit ?? organizationId ?? null,
      userId: actorId,
      action: 'permission.role.update',
      resource: 'role',
      resourceId: `${organizationId || 'platform'}:${role}`,
      details: { role, organizationId, actions: cleanActions },
      ipAddress: ipAddress || null,
    });
    return { role, actions: cleanActions };
  };

  const listUserOverrides = async (userId) => {
    const rows = await userPermissionRepository.findMany({ userId });
    return {
      userId,
      allowed: rows.filter((r) => r.allowed).map((r) => r.action),
      denied: rows.filter((r) => !r.allowed).map((r) => r.action),
    };
  };

  const syncUserOverrides = async ({ userId, allowed = [], denied = [], actorId, organizationId, ipAddress }) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found', { code: 'NOT_FOUND' });
    if (user.role === 'super_admin') {
      throw new AppError(422, 'Super admins always have full permissions', { code: 'VALIDATION_ERROR' });
    }
    const cleanAllowed = validateActions(allowed);
    const cleanDenied = validateActions(denied).filter((a) => !cleanAllowed.includes(a));
    await userPermissionRepository.deleteMany({ userId });
    const rows = [
      ...cleanAllowed.map((action) => ({ userId, action, allowed: true })),
      ...cleanDenied.map((action) => ({ userId, action, allowed: false })),
    ];
    if (rows.length) {
      for (const row of rows) {
        await userPermissionRepository.create(row);
      }
    }
    invalidateUser(userId);
    await auditLogRepository.create({
      organizationId: organizationId ?? user.organizationId,
      userId: actorId,
      action: 'permission.user.update',
      resource: 'user',
      resourceId: userId,
      details: { allowed: cleanAllowed, denied: cleanDenied },
      ipAddress: ipAddress || null,
    });
    return { userId, allowed: cleanAllowed, denied: cleanDenied };
  };

  const updateUserRole = async ({ userId, role, isActive, actorId, organizationId, ipAddress }) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found', { code: 'NOT_FOUND' });
    if (organizationId && user.organizationId !== organizationId) {
      throw new AppError(403, 'Cannot update a user outside your organization', { code: 'FORBIDDEN' });
    }
    if (role !== undefined && !ROLES.includes(role)) {
      throw new AppError(422, `Invalid role: ${role}`, { code: 'VALIDATION_ERROR' });
    }
    if (user.role === 'super_admin' && role !== undefined && role !== 'super_admin') {
      throw new AppError(422, 'A super admin cannot be demoted', { code: 'VALIDATION_ERROR' });
    }
    const data = {};
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    const updated = await userRepository.update(userId, data);
    invalidateUser(userId);
    await auditLogRepository.create({
      organizationId: organizationId ?? user.organizationId,
      userId: actorId,
      action: 'user.update',
      resource: 'user',
      resourceId: userId,
      details: { role: data.role, isActive: data.isActive, email: user.email },
      ipAddress: ipAddress || null,
    });
    return updated;
  };

  const removeUser = async ({ userId, actorId, organizationId, ipAddress }) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found', { code: 'NOT_FOUND' });
    if (organizationId && user.organizationId !== organizationId) {
      throw new AppError(403, 'Cannot remove a user outside your organization', { code: 'FORBIDDEN' });
    }
    if (user.role === 'super_admin') {
      throw new AppError(422, 'A super admin cannot be removed', { code: 'VALIDATION_ERROR' });
    }
    if (actorId && actorId === userId) {
      throw new AppError(422, 'You cannot remove your own account', { code: 'VALIDATION_ERROR' });
    }

    await userRepository.delete(userId);
    invalidateUser(userId);

    await auditLogRepository.create({
      organizationId: organizationId ?? user.organizationId,
      userId: actorId,
      action: 'user.delete',
      resource: 'user',
      resourceId: userId,
      details: { email: user.email, role: user.role },
      ipAddress: ipAddress || null,
    });

    return user;
  };

  const listUsers = ({ organizationId, page, limit, search, role, sort }) =>
    userListRepository.list({
      organizationId,
      page,
      limit,
      search,
      filters: { role },
      sort,
    });

  const getEffectiveForUser = async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found', { code: 'NOT_FOUND' });
    const perms = await buildEffectivePermissions(user);
    return { userId, role: user.role, actions: [...perms].sort() };
  };

  return {
    getCatalog,
    getMyPermissions,
    listRolePermissions,
    syncRolePermissions,
    listUserOverrides,
    syncUserOverrides,
    updateUserRole,
    removeUser,
    listUsers,
    getEffectiveForUser,
    hasPermission,
    hasAnyPermission,
    invalidateUser,
    resolvePermissions,
  };
};

export default createPermissionService;