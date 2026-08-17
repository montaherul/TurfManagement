import { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/datatable/DataTable';
import { Modal, Button, Input, Select, TextArea } from '../../components/ui';
import { getWorkOrders, createWorkOrder, updateWorkOrder, deleteWorkOrder } from '../../store/slices/workOrderSlice';
import { getFields } from '../../store/slices/fieldSlice';
import { usePermissions } from '../../hooks/usePermissions';
import {
  statusBadge,
  priorityBadge,
  moneyFormatter,
  dateFormatter,
  fieldRefFormatter,
  userFormatter,
  enumFilterParams,
} from '../../components/datatable/columns';
import { formatDate, titleCase } from '../../utils/format';
import { getApiError } from '../../utils/api';

const WO_STATUSES = ['created', 'assigned', 'in_progress', 'completed', 'verified', 'cancelled'];
const WO_PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const STATUS_FLOW = ['created', 'assigned', 'in_progress', 'completed', 'verified'];

const EMPTY_FORM = {
  title: '',
  fieldId: '',
  priority: 'medium',
  dueDate: '',
  estimatedCost: '',
  description: '',
};

const WorkOrders = () => {
  const dispatch = useDispatch();
  const { can } = usePermissions();
  const tableRef = useRef(null);
  const [fields, setFields] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingDetails, setEditingDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (can('workorder.create')) {
      dispatch(getFields({ page: 1, limit: 100 }))
        .unwrap()
        .then((payload) => setFields(payload.data || []))
        .catch(() => setFields([]));
    }
  }, [dispatch, can]);

  const columns = [
    {
      title: 'WO ID',
      field: 'workOrderId',
      width: 130,
      formatter: (cell) => `<span class="font-mono text-xs text-slate-500">${cell.getValue() || '—'}</span>`,
    },
    {
      title: 'Title',
      field: 'title',
      minWidth: 200,
      filterTarget: 'search',
      headerFilter: 'input',
      formatter: (cell) => `<span class="font-medium text-slate-900">${cell.getValue() || '—'}</span>`,
    },
    {
      title: 'Field',
      field: 'field',
      minWidth: 160,
      formatter: fieldRefFormatter,
    },
    {
      title: 'Priority',
      field: 'priority',
      width: 120,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(WO_PRIORITIES),
      formatter: priorityBadge,
    },
    {
      title: 'Status',
      field: 'status',
      width: 140,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(WO_STATUSES),
      formatter: statusBadge,
    },
    {
      title: 'Due Date',
      field: 'dueDate',
      width: 120,
      sorter: 'date',
      formatter: dateFormatter,
    },
    {
      title: 'Est. Cost',
      field: 'estimatedCost',
      width: 110,
      sorter: 'number',
      hozAlign: 'right',
      formatter: moneyFormatter,
    },
    {
      title: 'Assignee',
      field: 'assignee',
      width: 140,
      formatter: userFormatter,
    },
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(
        createWorkOrder({
          title: form.title,
          fieldId: form.fieldId,
          priority: form.priority,
          dueDate: form.dueDate || undefined,
          estimatedCost: form.estimatedCost === '' ? undefined : Number(form.estimatedCost),
          description: form.description || undefined,
        })
      ).unwrap();
      toast.success('Work order created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create work order'));
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (row) => {
    const idx = STATUS_FLOW.indexOf(row.status);
    const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    if (!next) return;
    try {
      await dispatch(updateWorkOrder({ id: row.id, data: { status: next } })).unwrap();
      toast.success(`Status → ${titleCase(next)}`);
      setEditing(null);
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update work order'));
    }
  };

  const openEditDetails = (row) => {
    setEditingDetails({
      id: row.id,
      title: row.title || '',
      fieldId: row.fieldId || '',
      priority: row.priority || 'medium',
      dueDate: row.dueDate ? row.dueDate.slice(0, 10) : '',
      estimatedCost: row.estimatedCost?.amount ?? row.estimatedCost ?? '',
      description: row.description || '',
    });
  };

  const saveEditDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(
        updateWorkOrder({
          id: editingDetails.id,
          data: {
            title: editingDetails.title,
            fieldId: editingDetails.fieldId,
            priority: editingDetails.priority,
            dueDate: editingDetails.dueDate || undefined,
            estimatedCost: editingDetails.estimatedCost === '' ? undefined : Number(editingDetails.estimatedCost),
            description: editingDetails.description || undefined,
          },
        })
      ).unwrap();
      toast.success('Work order updated');
      setEditingDetails(null);
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update work order'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete work order "${row.title}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteWorkOrder(row.id)).unwrap();
      toast.success('Work order deleted');
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete work order'));
    }
  };

  const actions = [
    ...(can('workorder.update')
      ? [
          {
            label: 'Advance Status',
            icon: 'check',
            color: 'text-slate-500 hover:text-green-600 hover:bg-green-50',
            show: (row) => STATUS_FLOW.includes(row.status) && STATUS_FLOW.indexOf(row.status) < STATUS_FLOW.length - 1,
            onClick: (row) => setEditing(row),
          },
        ]
      : []),
    {
      label: 'View',
      icon: 'eye',
      onClick: (row) => setEditing(row),
    },
    ...(can('workorder.update')
      ? [
          {
            label: 'Edit',
            icon: 'pencil',
            color: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50',
            onClick: openEditDetails,
          },
        ]
      : []),
    ...(can('workorder.delete')
      ? [
          {
            label: 'Delete',
            icon: 'trash',
            color: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
            onClick: handleDelete,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-slate-500 mt-1">Track and manage maintenance work orders</p>
        </div>
        {can('workorder.create') && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-5 h-5 mr-2" />
            New Work Order
          </Button>
        )}
      </div>

      <DataTable
        ref={tableRef}
        url="/work-orders"
        columns={columns}
        searchable={{ placeholder: 'Search work orders…' }}
        exportFileName="work-orders"
        initialSort={[{ field: 'createdAt', dir: 'desc' }]}
        placeholder="No work orders yet. They are auto-created from inspections or manually."
        actions={actions}
      />

      {/* New WO modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Work Order"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" form="wo-form" loading={saving}>
              Create
            </Button>
          </>
        }
      >
        <form id="wo-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Repair drainage on Main Stadium"
          />
          <Select
            label="Field"
            required
            value={form.fieldId}
            onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
          >
            <option value="">Select a field</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.fieldId})
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {WO_PRIORITIES.map((p) => (
                <option key={p} value={p}>{titleCase(p)}</option>
              ))}
            </Select>
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <Input
            label="Estimated Cost (BDT)"
            type="number"
            min="0"
            value={form.estimatedCost}
            onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
            placeholder="25000"
          />
          <TextArea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What needs to be done?"
          />
        </form>
      </Modal>

      {/* Edit details modal */}
      <Modal
        open={!!editingDetails}
        onClose={() => setEditingDetails(null)}
        title="Edit Work Order"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingDetails(null)}>
              Cancel
            </Button>
            <Button type="submit" form="wo-edit-form" loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingDetails && (
          <form id="wo-edit-form" onSubmit={saveEditDetails} className="space-y-4">
            <Input
              label="Title"
              required
              value={editingDetails.title}
              onChange={(e) => setEditingDetails({ ...editingDetails, title: e.target.value })}
            />
            <Select
              label="Field"
              required
              value={editingDetails.fieldId}
              onChange={(e) => setEditingDetails({ ...editingDetails, fieldId: e.target.value })}
            >
              <option value="">Select a field</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.fieldId})
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Priority"
                value={editingDetails.priority}
                onChange={(e) => setEditingDetails({ ...editingDetails, priority: e.target.value })}
              >
                {WO_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{titleCase(p)}</option>
                ))}
              </Select>
              <Input
                label="Due Date"
                type="date"
                value={editingDetails.dueDate}
                onChange={(e) => setEditingDetails({ ...editingDetails, dueDate: e.target.value })}
              />
            </div>
            <Input
              label="Estimated Cost (BDT)"
              type="number"
              min="0"
              value={editingDetails.estimatedCost}
              onChange={(e) => setEditingDetails({ ...editingDetails, estimatedCost: e.target.value })}
              placeholder="25000"
            />
            <TextArea
              label="Description"
              rows={3}
              value={editingDetails.description}
              onChange={(e) => setEditingDetails({ ...editingDetails, description: e.target.value })}
            />
          </form>
        )}
      </Modal>

      {/* Status transition modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Update Work Order Status"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Close
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{editing.title}</p>
              <p className="text-xs text-slate-500">
                {editing.workOrderId} • Due {formatDate(editing.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FLOW.map((status, i) => {
                const current = STATUS_FLOW.indexOf(editing.status);
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        i <= current ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {titleCase(status)}
                    </span>
                    {i < STATUS_FLOW.length - 1 && <span className="text-slate-300">→</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                {editing.status === 'cancelled' ? 'This order was cancelled.' : 'Advance to the next stage?'}
              </p>
              {editing.status !== 'cancelled' && (
                <Button size="sm" variant="success" onClick={() => advanceStatus(editing)}>
                  Advance Status
                </Button>
              )}
            </div>
            {editing.tasks?.length > 0 && (
              <div className="pt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Tasks</p>
                <ul className="space-y-1.5">
                  {editing.tasks.map((task, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.completed ? 'bg-success-500' : 'bg-slate-300'}`} />
                      {task.title || task.description || `Task ${i + 1}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkOrders;