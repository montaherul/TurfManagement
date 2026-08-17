import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Plus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/datatable/DataTable';
import { Modal, Button, Input, Select, EmptyState } from '../../components/ui';
import { deleteField, createField, updateField } from '../../store/slices/fieldSlice';
import { usePermissions } from '../../hooks/usePermissions';
import {
  badgeFormatter,
  STATUS_COLORS,
  TIER_COLORS,
  scoreFormatter,
  dateFormatter,
  enumFilterParams,
} from '../../components/datatable/columns';
import { formatDate, titleCase } from '../../utils/format';
import { getApiError } from '../../utils/api';

const SPORT_TYPES = ['cricket', 'football', 'multi_sport'];
const TURF_TYPES = ['natural_grass', 'hybrid', 'artificial'];
const FIELD_STATUSES = ['active', 'under_maintenance', 'inactive'];

const EMPTY_FORM = {
  name: '',
  sportType: 'cricket',
  turfType: 'natural_grass',
  status: 'active',
  address: '',
  dimensions: { lengthMeters: '', widthMeters: '' },
};

const Fields = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const tableRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canManage = can('field.create', 'field.delete');

  const columns = [
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
    {
      title: 'Sport',
      field: 'sportType',
      width: 130,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(SPORT_TYPES),
      formatter: badgeFormatter({
        cricket: 'bg-blue-100 text-blue-700',
        football: 'bg-success-100 text-success-700',
        multi_sport: 'bg-purple-100 text-purple-700',
      }),
    },
    {
      title: 'Turf',
      field: 'turfType',
      width: 140,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(TURF_TYPES),
      formatter: (cell) => `<span class="text-slate-700">${titleCase(cell.getValue())}</span>`,
    },
    {
      title: 'Status',
      field: 'status',
      width: 150,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(FIELD_STATUSES),
      formatter: badgeFormatter(STATUS_COLORS),
    },
    {
      title: 'Current Score',
      field: 'currentScore.total',
      width: 170,
      sorter: 'number',
      hozAlign: 'left',
      formatter: scoreFormatter,
      download: false,
    },
    {
      title: 'Last Inspection',
      field: 'currentScore.lastInspectionDate',
      width: 150,
      sorter: 'date',
      formatter: dateFormatter,
    },
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sportType: form.sportType,
        turfType: form.turfType,
        status: form.status,
        address: form.address || undefined,
        dimensions: {
          lengthMeters: Number(form.dimensions.lengthMeters),
          widthMeters: Number(form.dimensions.widthMeters),
        },
      };
      if (editingField) {
        await dispatch(updateField({ id: editingField.id, data: payload })).unwrap();
        toast.success('Field updated successfully');
      } else {
        await dispatch(createField(payload)).unwrap();
        toast.success('Field created successfully');
      }
      setShowModal(false);
      setEditingField(null);
      setForm(EMPTY_FORM);
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, editingField ? 'Failed to update field' : 'Failed to create field'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    const addressText = typeof row.address === 'object' && row.address ? row.address.text || '' : row.address || '';
    setEditingField(row);
    setForm({
      name: row.name || '',
      sportType: row.sportType || 'cricket',
      turfType: row.turfType || 'natural_grass',
      status: row.status || 'active',
      address: addressText,
      dimensions: {
        lengthMeters: row.dimensions?.lengthM ?? '',
        widthMeters: row.dimensions?.widthM ?? '',
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete field "${row.name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteField(row.id)).unwrap();
      toast.success('Field deleted');
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete field'));
    }
  };

  const actions = [
    {
      label: 'View',
      icon: 'eye',
      onClick: (row) => navigate(`/fields/${row.id}`),
    },
    ...(can('field.update')
      ? [{ label: 'Edit', icon: 'pencil', color: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50', onClick: openEdit }]
      : []),
    ...(can('field.delete')
      ? [{ label: 'Delete', icon: 'trash', color: 'text-slate-500 hover:text-red-600 hover:bg-red-50', onClick: handleDelete }]
      : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fields</h1>
          <p className="text-slate-500 mt-1">Manage your sports fields and venues</p>
        </div>
        {can('field.create') && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Field
          </Button>
        )}
      </div>

      {canManage || (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white rounded-xl px-4 py-3 shadow-card">
          <MapPin className="w-4 h-4" />
          You have read-only access to fields.
        </div>
      )}
      <DataTable
        ref={tableRef}
        url="/fields"
        columns={columns}
        searchable={{ placeholder: 'Search fields…' }}
        exportFileName="fields"
        rowClick={(row) => navigate(`/fields/${row.id}`)}
        placeholder="No fields found — add your first field to get started."
        actions={actions}
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingField(null);
          setForm(EMPTY_FORM);
        }}
        title={editingField ? 'Edit Field' : 'Add New Field'}
        width="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="field-form" loading={saving}>
              {editingField ? 'Save Changes' : 'Create Field'}
            </Button>
          </>
        }
      >
        <form id="field-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Field Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Main Stadium - Pitch A"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sport Type" value={form.sportType} onChange={(e) => setForm({ ...form, sportType: e.target.value })}>
              {SPORT_TYPES.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>
            <Select label="Turf Type" value={form.turfType} onChange={(e) => setForm({ ...form, turfType: e.target.value })}>
              {TURF_TYPES.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Length (m)"
              type="number"
              min="1"
              required
              value={form.dimensions.lengthMeters}
              onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, lengthMeters: e.target.value } })}
            />
            <Input
              label="Width (m)"
              type="number"
              min="1"
              required
              value={form.dimensions.widthMeters}
              onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, widthMeters: e.target.value } })}
            />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {FIELD_STATUSES.map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </Select>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Mirpur, Dhaka"
          />
        </form>
      </Modal>
    </div>
  );
};

export default Fields;