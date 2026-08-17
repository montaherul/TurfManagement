/**
 * Permission catalog and default role permissions.
 * Every action here can be granted to roles (platform-wide or per-organization)
 * and overridden per user.
 */

export const ROLES = ['super_admin', 'org_admin', 'inspector', 'viewer'];

export const PERMISSION_CATALOG = [
  { action: 'field.view', label: 'View fields', group: 'Fields' },
  { action: 'field.create', label: 'Create fields', group: 'Fields' },
  { action: 'field.update', label: 'Update fields', group: 'Fields' },
  { action: 'field.delete', label: 'Delete fields', group: 'Fields' },
  { action: 'inspection.view', label: 'View inspections', group: 'Inspections' },
  { action: 'inspection.create', label: 'Create inspections', group: 'Inspections' },
  { action: 'inspection.update', label: 'Update inspections', group: 'Inspections' },
  { action: 'inspection.delete', label: 'Delete inspections', group: 'Inspections' },
  { action: 'inspection.verify', label: 'Verify inspections', group: 'Inspections' },
  { action: 'workorder.view', label: 'View work orders', group: 'Work Orders' },
  { action: 'workorder.create', label: 'Create work orders', group: 'Work Orders' },
  { action: 'workorder.update', label: 'Update work orders', group: 'Work Orders' },
  { action: 'workorder.delete', label: 'Delete work orders', group: 'Work Orders' },
  { action: 'workorder.assign', label: 'Assign work orders', group: 'Work Orders' },
  { action: 'user.list', label: 'List team members', group: 'Team' },
  { action: 'user.create', label: 'Invite team members', group: 'Team' },
  { action: 'user.update', label: 'Update team members', group: 'Team' },
  { action: 'user.delete', label: 'Remove team members', group: 'Team' },
  { action: 'user.manage_permissions', label: 'Manage roles & permissions', group: 'Team' },
  { action: 'report.view', label: 'View reports & analytics', group: 'Reports' },
  { action: 'subscription.manage', label: 'Manage subscription & billing', group: 'Billing' },
  { action: 'settings.manage', label: 'Manage organization settings', group: 'Organization' },
  { action: 'organization.manage', label: 'Manage organizations (platform)', group: 'Platform' },
  { action: 'audit.view', label: 'View audit logs (platform)', group: 'Platform' },
];

export const ALL_ACTIONS = PERMISSION_CATALOG.map((p) => p.action);

export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ALL_ACTIONS,
  org_admin: [
    'field.view', 'field.create', 'field.update', 'field.delete',
    'inspection.view', 'inspection.create', 'inspection.update', 'inspection.delete', 'inspection.verify',
    'workorder.view', 'workorder.create', 'workorder.update', 'workorder.delete', 'workorder.assign',
    'user.list', 'user.create', 'user.update', 'user.delete', 'user.manage_permissions',
    'report.view', 'subscription.manage', 'settings.manage',
  ],
  inspector: [
    'field.view',
    'inspection.view', 'inspection.create', 'inspection.update',
    'workorder.view', 'workorder.assign',
  ],
  viewer: ['field.view', 'inspection.view', 'workorder.view', 'report.view'],
};

export const permissionGroups = () =>
  PERMISSION_CATALOG.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});