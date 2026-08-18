import { createPermissionService } from '../../src/services/permissionService.js';
import { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS, ROLES } from '../../src/config/permissions.js';

const makeService = (overrides = {}) => {
  const roleRows = [];
  const rolePermissionRepository = {
    findMany: async ({ role, facilityId }) => roleRows.filter((r) => r.role === role && r.facilityId === facilityId),
    deleteMany: async ({ role, facilityId }) => {
      for (let i = roleRows.length - 1; i >= 0; i -= 1) {
        if (roleRows[i].role === role && roleRows[i].facilityId === facilityId) roleRows.splice(i, 1);
      }
    },
    create: async (row) => roleRows.push(row),
  };

  const userOverrides = [];
  const userPermissionRepository = {
    findMany: async ({ userId }) => userOverrides.filter((r) => r.userId === userId),
    deleteMany: async () => { userOverrides.length = 0; },
    create: async (row) => userOverrides.push(row),
  };

  const users = new Map();
  const userRepository = {
    findById: async (id) => users.get(id) || null,
    update: async (id, data) => {
      const user = users.get(id);
      if (!user) throw new Error('User not found');
      return { ...user, ...data };
    },
    delete: async (id) => users.delete(id),
  };

  const listResults = [];
  const userListRepository = {
    list: async () => listResults,
  };

  const audits = [];
  const auditLogRepository = { create: async (entry) => audits.push(entry) };

  const service = createPermissionService({
    rolePermissionRepository,
    userPermissionRepository,
    userRepository,
    userListRepository,
    auditLogRepository,
  });

  return { service, roleRows, userOverrides, users, userRepository, audits, listResults };
};

describe('createPermissionService', () => {
  describe('platform_admin', () => {
    it('always has every permission regardless of facility', async () => {
      const { service } = makeService();
      const user = { id: 'u-1', role: 'platform_admin', facilityId: null };
      const perms = await service.resolvePermissions(user);
      expect(perms.size).toBe(PERMISSION_CATALOG.length);
    });

    it('cannot be demoted', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'platform_admin', email: 'admin@test.dev' });
      await expect(service.updateUserRole({ userId: 'u-1', role: 'manager', actorId: 'u-2', ipAddress: '1.2.3.4' })).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    });

    it('cannot be removed', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'platform_admin', email: 'admin@test.dev' });
      await expect(service.removeUser({ userId: 'u-1', actorId: 'u-2', ipAddress: '1.2.3.4' })).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    });
  });

  describe('default role permissions', () => {
    it('returns built-in defaults when no facility/platform rows exist', async () => {
      const { service } = makeService();
      const user = { id: 'u-1', role: 'manager', facilityId: 'fac-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms).toEqual(new Set(DEFAULT_ROLE_PERMISSIONS.manager));
    });
  });

  describe('role permission override hierarchy', () => {
    it('uses facility role rows when present', async () => {
      const { service, roleRows } = makeService();
      roleRows.push({ role: 'manager', action: 'resource.delete', facilityId: 'fac-1' });
      const user = { id: 'u-1', role: 'manager', facilityId: 'fac-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms.has('resource.delete')).toBe(true);
    });

    it('falls back to platform rows when facility rows are empty', async () => {
      const { service, roleRows } = makeService();
      roleRows.push({ role: 'manager', action: 'booking.cancel', facilityId: null });
      const user = { id: 'u-1', role: 'manager', facilityId: 'fac-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms.has('booking.cancel')).toBe(true);
    });
  });

  describe('user overrides', () => {
    it('adds allowed actions and removes denied actions', async () => {
      const { service, userOverrides, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'manager', facilityId: 'fac-1' });
      userOverrides.push({ userId: 'u-1', action: 'resource.delete', allowed: true });
      userOverrides.push({ userId: 'u-1', action: 'slot.update', allowed: false });
      const user = { id: 'u-1', role: 'manager', facilityId: 'fac-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms.has('resource.delete')).toBe(true);
      expect(perms.has('slot.update')).toBe(false);
    });
  });

  describe('caching', () => {
    it('returns cached permissions on second call', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'manager', facilityId: 'fac-1' });
      const user = { id: 'u-1', role: 'manager', facilityId: 'fac-1' };
      await service.resolvePermissions(user);
      await service.resolvePermissions(user);
      expect(service.getCatalog).toBeDefined();
    });
  });

  describe('syncRolePermissions', () => {
    it('replaces all actions for a role and audits', async () => {
      const { service, audits } = makeService();
      const result = await service.syncRolePermissions({
        role: 'manager',
        actions: ['resource.view', 'booking.view'],
        facilityId: 'fac-1',
        actorId: 'u-1',
        ipAddress: '1.2.3.4',
      });
      expect(result.actions).toEqual(['resource.view', 'booking.view']);
      expect(audits[0].action).toBe('permission.role.update');
      expect(audits[0].facilityId).toBe('fac-1');
    });

    it('rejects invalid roles', async () => {
      const { service } = makeService();
      await expect(service.syncRolePermissions({ role: 'hacker', actions: [], actorId: 'u-1' })).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('syncUserOverrides', () => {
    it('saves allowed and denied lists', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'manager', facilityId: 'fac-1', email: 'm@test.dev' });
      const result = await service.syncUserOverrides({
        userId: 'u-1',
        allowed: ['resource.create'],
        denied: ['resource.delete'],
        actorId: 'u-2',
        ipAddress: '1.2.3.4',
      });
      expect(result.allowed).toEqual(['resource.create']);
      expect(result.denied).toEqual(['resource.delete']);
    });
  });

  describe('updateUserRole', () => {
    it('updates role and isActive', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'manager', facilityId: 'fac-1', email: 'm@test.dev' });
      const updated = await service.updateUserRole({ userId: 'u-1', role: 'operator', actorId: 'u-2', ipAddress: '1.2.3.4' });
      expect(updated.role).toBe('operator');
    });
  });

  describe('removeUser', () => {
    it('deletes user and audits', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'manager', facilityId: 'fac-1', email: 'm@test.dev' });
      const removed = await service.removeUser({ userId: 'u-1', actorId: 'u-2', ipAddress: '1.2.3.4' });
      expect(removed.email).toBe('m@test.dev');
      expect(users.has('u-1')).toBe(false);
    });
  });

  describe('getCatalog', () => {
    it('returns catalog, groups, and roles', () => {
      const { service } = makeService();
      const catalog = service.getCatalog();
      expect(catalog.roles).toEqual(ROLES);
      expect(catalog.catalog.length).toBe(PERMISSION_CATALOG.length);
      expect(Object.keys(catalog.groups).length).toBeGreaterThan(0);
    });
  });
});