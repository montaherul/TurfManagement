import { createPermissionService } from '../../src/services/permissionService.js';
import { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS, ROLES } from '../../src/config/permissions.js';

const makeService = (overrides = {}) => {
  const roleRows = [];
  const rolePermissionRepository = {
    findMany: async ({ role, organizationId }) => roleRows.filter((r) => r.role === role && r.organizationId === organizationId),
    deleteMany: async () => { roleRows.length = 0; },
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
  describe('super_admin', () => {
    it('always has every permission', async () => {
      const { service } = makeService();
      const user = { id: 'u-1', role: 'super_admin', organizationId: null };
      const perms = await service.resolvePermissions(user);
      expect(perms.size).toBe(PERMISSION_CATALOG.length);
    });

    it('cannot be demoted', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'super_admin', email: 'admin@test.dev' });
      await expect(service.updateUserRole({ userId: 'u-1', role: 'org_admin', actorId: 'u-2', ipAddress: '1.2.3.4' })).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    });

    it('cannot be removed', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'super_admin', email: 'admin@test.dev' });
      await expect(service.removeUser({ userId: 'u-1', actorId: 'u-2', ipAddress: '1.2.3.4' })).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    });
  });

  describe('default role permissions', () => {
    it('returns built-in defaults when no org/platform rows exist', async () => {
      const { service } = makeService();
      const user = { id: 'u-1', role: 'inspector', organizationId: 'org-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms).toEqual(new Set(DEFAULT_ROLE_PERMISSIONS.inspector));
    });
  });

  describe('role permission override hierarchy', () => {
    it('uses org role rows when present', async () => {
      const { service, roleRows } = makeService();
      roleRows.push({ role: 'inspector', action: 'field.delete', organizationId: 'org-1' });
      const user = { id: 'u-1', role: 'inspector', organizationId: 'org-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms.has('field.delete')).toBe(true);
    });

    it('falls back to platform rows when org rows are empty', async () => {
      const { service, roleRows } = makeService();
      roleRows.push({ role: 'inspector', action: 'workorder.delete', organizationId: null });
      const user = { id: 'u-1', role: 'inspector', organizationId: 'org-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms.has('workorder.delete')).toBe(true);
    });
  });

  describe('user overrides', () => {
    it('adds allowed actions and removes denied actions', async () => {
      const { service, userOverrides, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'inspector', organizationId: 'org-1' });
      userOverrides.push({ userId: 'u-1', action: 'field.create', allowed: true });
      userOverrides.push({ userId: 'u-1', action: 'inspection.create', allowed: false });
      const user = { id: 'u-1', role: 'inspector', organizationId: 'org-1' };
      const perms = await service.resolvePermissions(user);
      expect(perms.has('field.create')).toBe(true);
      expect(perms.has('inspection.create')).toBe(false);
    });
  });

  describe('caching', () => {
    it('returns cached permissions on second call', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'inspector', organizationId: 'org-1' });
      const user = { id: 'u-1', role: 'inspector', organizationId: 'org-1' };
      await service.resolvePermissions(user);
      await service.resolvePermissions(user);
      expect(service.getCatalog).toBeDefined();
    });
  });

  describe('syncRolePermissions', () => {
    it('replaces all actions for a role and audits', async () => {
      const { service, audits } = makeService();
      const result = await service.syncRolePermissions({
        role: 'inspector',
        actions: ['field.view', 'inspection.create'],
        organizationId: 'org-1',
        actorId: 'u-1',
        ipAddress: '1.2.3.4',
      });
      expect(result.actions).toEqual(['field.view', 'inspection.create']);
      expect(audits[0].action).toBe('permission.role.update');
    });

    it('rejects invalid roles', async () => {
      const { service } = makeService();
      await expect(service.syncRolePermissions({ role: 'hacker', actions: [], actorId: 'u-1' })).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('syncUserOverrides', () => {
    it('saves allowed and denied lists', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'inspector', organizationId: 'org-1', email: 'i@test.dev' });
      const result = await service.syncUserOverrides({
        userId: 'u-1',
        allowed: ['field.create'],
        denied: ['field.delete'],
        actorId: 'u-2',
        ipAddress: '1.2.3.4',
      });
      expect(result.allowed).toEqual(['field.create']);
      expect(result.denied).toEqual(['field.delete']);
    });
  });

  describe('updateUserRole', () => {
    it('updates role and isActive', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'inspector', organizationId: 'org-1', email: 'i@test.dev' });
      const updated = await service.updateUserRole({ userId: 'u-1', role: 'org_admin', actorId: 'u-2', ipAddress: '1.2.3.4' });
      expect(updated.role).toBe('org_admin');
    });
  });

  describe('removeUser', () => {
    it('deletes user and audits', async () => {
      const { service, users } = makeService();
      users.set('u-1', { id: 'u-1', role: 'inspector', organizationId: 'org-1', email: 'i@test.dev' });
      const removed = await service.removeUser({ userId: 'u-1', actorId: 'u-2', ipAddress: '1.2.3.4' });
      expect(removed.email).toBe('i@test.dev');
      expect(users.has('u-1')).toBe(false);
    });
  });

  describe('getCatalog', () => {
    it('returns catalog, groups, and roles', () => {
      const { service } = makeService();
      const catalog = service.getCatalog();
      expect(catalog.roles).toEqual(ROLES);
      expect(Object.keys(catalog.groups).length).toBeGreaterThan(0);
    });
  });
});
