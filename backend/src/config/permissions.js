/**
 * Permission catalog and default role permissions for TurfBook.
 * Every action here can be granted to roles (platform-wide or per-facility)
 * and overridden per user.
 */

export const ROLES = ['platform_admin', 'facility_owner', 'manager', 'operator', 'booker'];

export const PERMISSION_CATALOG = [
  { action: 'facility.view', label: 'View facility (public)', group: 'Facility' },
  { action: 'facility.manage', label: 'Manage facility profile & settings', group: 'Facility' },
  { action: 'facility.approve', label: 'Approve facility applications (platform)', group: 'Platform' },
  { action: 'facility.suspend', label: 'Suspend / activate facilities (platform)', group: 'Platform' },
  { action: 'resource.view', label: 'View resources', group: 'Resources' },
  { action: 'resource.create', label: 'Create resources', group: 'Resources' },
  { action: 'resource.update', label: 'Update resources', group: 'Resources' },
  { action: 'resource.delete', label: 'Delete resources', group: 'Resources' },
  { action: 'slot.view', label: 'View slots & availability', group: 'Slots' },
  { action: 'slot.generate', label: 'Generate slots from template', group: 'Slots' },
  { action: 'slot.update', label: 'Block / maintain slots', group: 'Slots' },
  { action: 'booking.view', label: 'View bookings', group: 'Bookings' },
  { action: 'booking.create', label: 'Create bookings', group: 'Bookings' },
  { action: 'booking.update', label: 'Update booking status (confirm/check-in/out/no-show)', group: 'Bookings' },
  { action: 'booking.cancel', label: 'Cancel bookings', group: 'Bookings' },
  { action: 'payment.view', label: 'View payments & wallet', group: 'Payments' },
  { action: 'payment.verify', label: 'Verify / reject payment proofs', group: 'Payments' },
  { action: 'expense.view', label: 'View expenses', group: 'Expenses' },
  { action: 'expense.create', label: 'Record expenses', group: 'Expenses' },
  { action: 'expense.update', label: 'Update expenses', group: 'Expenses' },
  { action: 'expense.delete', label: 'Delete expenses', group: 'Expenses' },
  { action: 'package.view', label: 'View packages', group: 'Packages' },
  { action: 'package.create', label: 'Create packages', group: 'Packages' },
  { action: 'package.update', label: 'Update packages', group: 'Packages' },
  { action: 'package.delete', label: 'Delete packages', group: 'Packages' },
  { action: 'package.purchase', label: 'Purchase packages', group: 'Packages' },
  { action: 'tournament.view', label: 'View tournaments', group: 'Tournaments' },
  { action: 'tournament.create', label: 'Create tournaments', group: 'Tournaments' },
  { action: 'tournament.update', label: 'Update tournaments & results', group: 'Tournaments' },
  { action: 'tournament.delete', label: 'Delete tournaments', group: 'Tournaments' },
  { action: 'tournament.register', label: 'Register tournament teams', group: 'Tournaments' },
  { action: 'blacklist.view', label: 'View blacklist', group: 'Blacklist' },
  { action: 'blacklist.create', label: 'Add blacklist entries', group: 'Blacklist' },
  { action: 'blacklist.delete', label: 'Remove blacklist entries', group: 'Blacklist' },
  { action: 'report.view', label: 'View reports', group: 'Reports' },
  { action: 'user.list', label: 'List facility staff & customers', group: 'Team' },
  { action: 'user.create', label: 'Create staff accounts', group: 'Team' },
  { action: 'user.update', label: 'Update staff accounts', group: 'Team' },
  { action: 'user.delete', label: 'Remove staff accounts', group: 'Team' },
  { action: 'admin.facilities', label: 'Manage all facilities (platform)', group: 'Platform' },
  { action: 'admin.customers', label: 'View platform customers (platform)', group: 'Platform' },
  { action: 'admin.fees', label: 'View platform fees (platform)', group: 'Platform' },
  { action: 'admin.settings', label: 'Manage platform settings (platform)', group: 'Platform' },
];

export const ALL_ACTIONS = PERMISSION_CATALOG.map((p) => p.action);

export const DEFAULT_ROLE_PERMISSIONS = {
  platform_admin: ALL_ACTIONS,
  facility_owner: [
    'facility.view', 'facility.manage',
    'resource.view', 'resource.create', 'resource.update', 'resource.delete',
    'slot.view', 'slot.generate', 'slot.update',
    'booking.view', 'booking.update', 'booking.cancel',
    'payment.view', 'payment.verify',
    'expense.view', 'expense.create', 'expense.update', 'expense.delete',
    'package.view', 'package.create', 'package.update', 'package.delete',
    'tournament.view', 'tournament.create', 'tournament.update', 'tournament.delete',
    'blacklist.view', 'blacklist.create', 'blacklist.delete',
    'report.view',
    'user.list', 'user.create', 'user.update', 'user.delete',
  ],
  manager: [
    'facility.view',
    'resource.view', 'resource.update',
    'slot.view', 'slot.update',
    'booking.view', 'booking.update', 'booking.cancel',
    'payment.view',
    'package.view',
    'tournament.view',
    'report.view',
    'user.list',
  ],
  operator: [
    'facility.view',
    'resource.view',
    'slot.view', 'slot.update',
    'booking.view', 'booking.update',
    'payment.view', 'payment.verify',
    'blacklist.view',
  ],
  booker: [
    'facility.view',
    'slot.view',
    'booking.create', 'booking.view', 'booking.cancel',
    'package.purchase', 'package.view',
    'tournament.view', 'tournament.register',
  ],
};

export const permissionGroups = () =>
  PERMISSION_CATALOG.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});