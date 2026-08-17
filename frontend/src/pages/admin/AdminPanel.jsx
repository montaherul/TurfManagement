import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Server, Shield, FileClock, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/datatable/DataTable';
import { ErrorState, Select } from '../../components/ui';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PermissionMatrix from '../../components/permissions/PermissionMatrix';
import UserPermissionsModal from '../../components/permissions/UserPermissionsModal';
import { getAdminHealth } from '../../store/slices/adminSlice';
import { permissionService } from '../../services/permissionService';
import { getApiError } from '../../utils/api';
import {
  statusBadge,
  dateFormatter,
  datetimeFormatter,
  badgeFormatter,
  enumFilterParams,
  scoreFormatter,
} from '../../components/datatable/columns';
import { titleCase } from '../../utils/format';

const ROLE_COLORS = {
  super_admin: 'bg-danger-100 text-danger-600',
  org_admin: 'bg-primary-100 text-primary-700',
  inspector: 'bg-success-100 text-success-700',
  viewer: 'bg-slate-100 text-slate-600',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: Server },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'fields', label: 'Fields', icon: Shield },
  { id: 'permissions', label: 'Permissions', icon: Building2 },
  { id: 'audit', label: 'Audit Logs', icon: FileClock },
];

const AdminPanel = () => {
  const dispatch = useDispatch();
  const { health, loading, error } = useSelector((state) => state.admin);
  const [activeTab, setActiveTab] = useState('overview');
  const [healthError, setHealthError] = useState(null);

  const [platformRoles, setPlatformRoles] = useState([]);
  const [orgRoles, setOrgRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [groups, setGroups] = useState({});
  const [permUser, setPermUser] = useState(null);
  const [permOverrides, setPermOverrides] = useState(null);
  const [permSaving, setPermSaving] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);

  const loadHealth = () => {
    setHealthError(null);
    dispatch(getAdminHealth()).catch((err) => setHealthError(err));
  };

  useEffect(() => {
    loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const loadPlatformPermissions = () => {
    Promise.all([permissionService.getCatalog(), permissionService.getPlatformRoles()])
      .then(([catalog, roles]) => {
        setGroups(catalog.data?.groups || {});
        setPlatformRoles(roles.data || []);
      })
      .catch((err) => toast.error(getApiError(err, 'Failed to load platform permissions')));
  };

  const loadOrganizations = () => {
    permissionService
      .getOrganizations()
      .then((payload) => setOrganizations(payload.data || []))
      .catch(() => setOrganizations([]));
  };

  const loadOrgRoles = (orgId) => {
    if (!orgId) return setOrgRoles([]);
    permissionService
      .getOrganizationRoles(orgId)
      .then((payload) => setOrgRoles(payload.data || []))
      .catch((err) => toast.error(getApiError(err, 'Failed to load organization roles')));
  };

  useEffect(() => {
    if (activeTab !== 'permissions') return;
    loadPlatformPermissions();
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadOrgRoles(selectedOrg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrg]);

  const handlePlatformRoleSave = async (role, actions) => {
    setRoleSaving(true);
    try {
      await permissionService.updatePlatformRole(role, actions);
      toast.success('Platform role permissions saved');
      loadPlatformPermissions();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save platform role permissions'));
      throw err;
    } finally {
      setRoleSaving(false);
    }
  };

  const handleOrgRoleSave = async (role, actions) => {
    setRoleSaving(true);
    try {
      await permissionService.updateOrganizationRole(selectedOrg, role, actions);
      toast.success('Organization role permissions saved');
      loadOrgRoles(selectedOrg);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save organization role permissions'));
      throw err;
    } finally {
      setRoleSaving(false);
    }
  };

  const openUserPermissions = (row) => {
    setPermUser(row);
    setPermOverrides({ allowed: [], denied: [] });
    setPermLoading(true);
    permissionService
      .getPlatformUserPermissions(row.id)
      .then((payload) => setPermOverrides(payload.data || { allowed: [], denied: [] }))
      .catch((err) => toast.error(getApiError(err, 'Failed to load user permissions')))
      .finally(() => setPermLoading(false));
  };

  const handleUserOverridesSave = async (allowed, denied) => {
    setPermSaving(true);
    try {
      await permissionService.updatePlatformUserPermissions(permUser.id, { allowed, denied });
      toast.success('User permissions saved');
      setPermUser(null);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save user permissions'));
    } finally {
      setPermSaving(false);
    }
  };

  const userColumns = [
    {
      title: 'Name',
      field: 'name',
      minWidth: 160,
      filterTarget: 'search',
      headerFilter: 'input',
      formatter: (cell) => {
        const value = cell.getValue() || '';
        return `<span class="font-medium text-slate-900">${value}</span>`;
      },
    },
    {
      title: 'Email',
      field: 'email',
      minWidth: 200,
      formatter: (cell) => `<span class="text-slate-600">${cell.getValue() || '—'}</span>`,
    },
    {
      title: 'Role',
      field: 'role',
      width: 130,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(['super_admin', 'org_admin', 'inspector', 'viewer']),
      formatter: badgeFormatter(ROLE_COLORS),
    },
    {
      title: 'Organization',
      field: 'organization',
      minWidth: 160,
      formatter: (cell) => {
        const v = cell.getValue();
        if (typeof v === 'object') return `<span>${v.name || '—'}</span>`;
        return `<span>${v || '—'}</span>`;
      },
    },
    {
      title: 'Status',
      field: 'isActive',
      width: 110,
      formatter: (cell) =>
        cell.getValue() === false
          ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>'
          : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-700">Active</span>',
    },
    { title: 'Joined', field: 'createdAt', width: 120, sorter: 'date', formatter: dateFormatter },
  ];

  const adminFieldColumns = [
    {
      title: 'Field ID',
      field: 'fieldId',
      width: 130,
      formatter: (cell) => `<span class="font-mono text-xs text-slate-500">${cell.getValue() || '—'}</span>`,
    },
    {
      title: 'Name',
      field: 'name',
      minWidth: 180,
      filterTarget: 'search',
      headerFilter: 'input',
      formatter: (cell) => `<span class="font-medium text-slate-900">${cell.getValue() || '—'}</span>`,
    },
    { title: 'Sport', field: 'sportType', width: 120, formatter: (c) => titleCase(c.getValue()) },
    { title: 'Turf', field: 'turfType', width: 140, formatter: (c) => titleCase(c.getValue()) },
    { title: 'Status', field: 'status', width: 150, formatter: statusBadge },
    { title: 'Score', field: 'currentScore.total', width: 160, sorter: 'number', formatter: scoreFormatter },
    { title: 'Created', field: 'createdAt', width: 120, sorter: 'date', formatter: dateFormatter },
  ];

  const auditColumns = [
    { title: 'Time', field: 'createdAt', width: 160, sorter: 'date', formatter: datetimeFormatter },
    {
      title: 'User',
      field: 'user',
      minWidth: 140,
      formatter: (cell) => {
        const v = cell.getValue();
        if (typeof v === 'object') {
          const name = [v.firstName, v.lastName].filter(Boolean).join(' ') || v.email || '—';
          return `<span>${name}</span>`;
        }
        return `<span>${v || '—'}</span>`;
      },
    },
    {
      title: 'Action',
      field: 'action',
      width: 120,
      formatter: (c) => `<span class="font-medium text-slate-800">${titleCase(c.getValue())}</span>`,
    },
    {
      title: 'Resource',
      field: 'resource',
      minWidth: 160,
      formatter: (c) => `<span class="text-slate-600">${c.getValue() || '—'}</span>`,
    },
    {
      title: 'IP',
      field: 'ip',
      width: 130,
      formatter: (c) => `<span class="font-mono text-xs text-slate-500">${c.getValue() || '—'}</span>`,
    },
  ];

  const platformUserColumns = [
    {
      title: 'Name',
      field: 'name',
      minWidth: 160,
      filterTarget: 'search',
      headerFilter: 'input',
      formatter: (cell) => `<span class="font-medium text-slate-900">${cell.getValue() || '—'}</span>`,
    },
    {
      title: 'Email',
      field: 'email',
      minWidth: 200,
      formatter: (cell) => `<span class="text-slate-600">${cell.getValue() || '—'}</span>`,
    },
    {
      title: 'Role',
      field: 'role',
      width: 130,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(['super_admin', 'org_admin', 'inspector', 'viewer']),
      formatter: badgeFormatter(ROLE_COLORS),
    },
    {
      title: 'Organization',
      field: 'organization',
      minWidth: 160,
      formatter: (cell) => {
        const v = cell.getValue();
        if (typeof v === 'object') return `<span>${v.name || '—'}</span>`;
        return `<span>${v || '—'}</span>`;
      },
    },
  ];

  const platformUserActions = [
    {
      label: 'Permissions',
      icon: 'shield',
      color: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50',
      onClick: openUserPermissions,
    },
  ];

  const healthStats = health
    ? [
        { label: 'Status', value: health.status || (health.success ? 'Healthy' : 'Degraded') },
        { label: 'Database', value: health.database || '—' },
        { label: 'Uptime', value: health.uptime ? `${Math.round(Number(health.uptime) / 60)}m` : '—' },
        { label: 'Environment', value: health.environment || '—' },
        { label: 'Timestamp', value: health.timestamp ? new Date(health.timestamp).toLocaleString() : '—' },
      ]
    : [];

  if (loading && !health) return <LoadingSpinner text="Loading admin panel…" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 mt-1">Platform administration and monitoring</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="border-b border-slate-200 px-4 overflow-x-auto">
          <nav className="flex -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {healthError ? (
                <ErrorState message={healthError} onRetry={loadHealth} />
              ) : health ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {healthStats.map((s) => (
                      <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                        <p className="text-sm text-slate-500">{s.label}</p>
                        <p className="text-lg font-semibold text-slate-900 truncate">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {health.details && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(health.details).map(([key, value]) => (
                        <div key={key} className="bg-white border border-slate-100 rounded-xl p-4">
                          <p className="text-sm text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="font-semibold text-slate-900 truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <LoadingSpinner text="Checking service health…" />
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <DataTable
              url="/admin/users"
              columns={userColumns}
              searchable={{ placeholder: 'Search users…' }}
              exportFileName="admin-users"
              placeholder="No users found."
            />
          )}

          {activeTab === 'fields' && (
            <DataTable
              url="/admin/fields"
              columns={adminFieldColumns}
              searchable={{ placeholder: 'Search fields…' }}
              exportFileName="admin-fields"
              placeholder="No fields found."
            />
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Platform role defaults</h3>
                <PermissionMatrix
                  roles={platformRoles}
                  groups={groups}
                  lockedRoles={['super_admin']}
                  scopeLabel="Platform-wide"
                  onSave={handlePlatformRoleSave}
                />
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Organization role overrides</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Pick an organization to override its role defaults. Empty rows fall back to platform defaults.
                </p>
                <div className="max-w-xs mb-6">
                  <Select
                    label="Organization"
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                  >
                    <option value="">Select an organization…</option>
                    {(organizations || []).map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {selectedOrg ? (
                  <PermissionMatrix
                    roles={orgRoles}
                    groups={groups}
                    lockedRoles={['super_admin']}
                    scopeLabel={organizations.find((o) => o.id === selectedOrg)?.name || 'Organization'}
                    onSave={handleOrgRoleSave}
                  />
                ) : (
                  <p className="text-sm text-slate-400">Select an organization to edit its role permissions.</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-base font-semibold text-slate-900 mb-1">Per-user overrides</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Grant or block individual actions for any user, on top of their role permissions.
                </p>
                <DataTable
                  url="/admin/users"
                  columns={platformUserColumns}
                  searchable={{ placeholder: 'Search users…' }}
                  exportFileName="permission-overrides"
                  placeholder="No users found."
                  actions={platformUserActions}
                />
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <DataTable
              url="/admin/audit-logs"
              columns={auditColumns}
              searchable={{ placeholder: 'Search audit logs…' }}
              exportFileName="audit-logs"
              initialSort={[{ field: 'createdAt', dir: 'desc' }]}
              placeholder="No audit records yet."
            />
          )}
        </div>
      </div>

      <UserPermissionsModal
        open={!!permUser}
        onClose={() => setPermUser(null)}
        user={permUser}
        groups={groups}
        overrides={permOverrides}
        saving={permSaving}
        loading={permLoading}
        onSave={handleUserOverridesSave}
      />
    </div>
  );
};

export default AdminPanel;