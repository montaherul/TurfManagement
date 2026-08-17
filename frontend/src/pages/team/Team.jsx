import { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, UserCog, ShieldCheck } from 'lucide-react';import toast from 'react-hot-toast';
import DataTable from '../../components/datatable/DataTable';
import { Modal, Button, Input, Select } from '../../components/ui';
import { badgeFormatter, dateFormatter, enumFilterParams } from '../../components/datatable/columns';
import PermissionMatrix from '../../components/permissions/PermissionMatrix';
import UserPermissionsModal from '../../components/permissions/UserPermissionsModal';
import { adminService } from '../../services/adminService';
import {
  fetchRolePermissions,
  fetchUserPermissions,
  updateRolePermissions,
  updateUserPermissions,
  updateUser,
} from '../../store/slices/permissionsSlice';
import { getApiError } from '../../utils/api';

const ROLES = ['org_admin', 'inspector', 'viewer'];
const ROLE_COLORS = {
  org_admin: 'bg-primary-100 text-primary-700',
  inspector: 'bg-success-100 text-success-700',
  viewer: 'bg-slate-100 text-slate-600',
};

const EMPTY_FORM = { email: '', firstName: '', lastName: '', role: 'inspector', password: '' };

const Team = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const { groups, roleConfig, userOverrides } = useSelector((state) => state.permissions);
  const tableRef = useRef(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('viewer');
  const [editActive, setEditActive] = useState(true);
  const [permUser, setPermUser] = useState(null);
  const [permSaving, setPermSaving] = useState(false);

  const loadRoles = () => dispatch(fetchRolePermissions()).unwrap().catch(() => {});

  const loadOverrides = (userId) =>
    dispatch(fetchUserPermissions(userId)).unwrap().catch(() => {});

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.createUser(form);
      toast.success('User created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleSave = async () => {
    setSaving(true);
    try {
      await dispatch(updateUser({ userId: editUser.id, role: editRole, isActive: editActive })).unwrap();
      toast.success('User updated');
      setEditUser(null);
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (row) => {
    if (!window.confirm(`Remove ${row.name || row.email} from the team? This cannot be undone.`)) return;
    try {
      await permissionService.removeUser(row.id);
      toast.success('User removed');
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to remove user'));
    }
  };

  const handleMatrixSave = async (role, actions) => {
    try {
      await dispatch(updateRolePermissions({ role, actions })).unwrap();
      toast.success('Role permissions saved');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to save role permissions'));
      throw error;
    }
  };

  const handleOverridesSave = async (allowed, denied) => {
    setPermSaving(true);
    try {
      await dispatch(updateUserPermissions({ userId: permUser.id, allowed, denied })).unwrap();
      toast.success('User permissions saved');
      setPermUser(null);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to save user permissions'));
    } finally {
      setPermSaving(false);
    }
  };

  const columns = [
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
      headerFilterParams: enumFilterParams(ROLES),
      formatter: badgeFormatter(ROLE_COLORS),
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

  const actions = [
    {
      label: 'Permissions',
      icon: 'shield',
      color: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50',
      onClick: (row) => {
        setPermUser(row);
        loadOverrides(row.id);
      },
    },
    {
      label: 'Edit',
      icon: 'pencil',
      color: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
      onClick: (row) => {
        setEditUser(row);
        setEditRole(row.role || 'viewer');
        setEditActive(row.isActive !== false);
      },
    },
    {
      label: 'Delete',
      icon: 'trash',
      color: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
      show: (row) => row.id !== currentUser?.id && row.role !== 'org_admin',
      onClick: handleDeleteUser,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team & Permissions</h1>
          <p className="text-slate-500 mt-1">Manage your team members, roles, and their access</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create User
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
            <UserCog className="w-5 h-5 text-primary-600" />
            Role Defaults
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Default permissions applied to every user in this organization by role. Empty = platform defaults.
          </p>
          <PermissionMatrix
            roles={roleConfig.filter((r) => ROLES.includes(r.role))}
            groups={groups}
            scopeLabel="This organization"
            onSave={handleMatrixSave}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            Team Members
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Change roles or grant individual permission overrides. Use the Permissions action on a row.
          </p>
          <DataTable
            ref={tableRef}
            url="/permissions/users"
            columns={columns}
            searchable={{ placeholder: 'Search team members…' }}
            exportFileName="team-members"
            placeholder="No team members yet."
            actions={actions}
          />
        </div>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" form="team-user-form" loading={saving}>
              Create
            </Button>
          </>
        }
      >
        <form id="team-user-form" onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="member@company.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Minimum 8 characters"
          />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={editUser ? `Edit — ${editUser.name || editUser.email}` : 'Edit User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleRoleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Role" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
            />
            Active account
          </label>
        </div>
      </Modal>

      <UserPermissionsModal
        open={!!permUser}
        onClose={() => setPermUser(null)}
        user={permUser}
        groups={groups}
        overrides={userOverrides}
        saving={permSaving}
        onSave={handleOverridesSave}
      />
    </div>
  );
};

export default Team;