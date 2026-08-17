import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/datatable/DataTable';
import { Button } from '../../components/ui';
import { verifyInspection, deleteInspection } from '../../store/slices/inspectionSlice';
import { inspectionService } from '../../services/inspectionService';
import { usePermissions } from '../../hooks/usePermissions';
import {
  statusBadge,
  tierBadge,
  scoreFormatter,
  dateFormatter,
  fieldRefFormatter,
  userFormatter,
  enumFilterParams,
  rangeColumn,
} from '../../components/datatable/columns';
import { getApiError } from '../../utils/api';

const INSPECTION_STATUSES = ['draft', 'submitted', 'verified'];
const TIER_RANGES = {
  excellent: { gte: 85 },
  good: { gte: 70, lte: 84 },
  acceptable: { gte: 55, lte: 69 },
  poor: { lte: 54 },
};

const Inspections = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const tableRef = useRef(null);

  const canVerify = can('inspection.verify');
  const canCreate = can('inspection.create');

  const downloadPdf = async (row) => {
    try {
      toast.loading('Generating PDF…', { id: 'pdf' });
      const blob = await inspectionService.getInspectionPdf(row.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inspection-${row.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch (error) {
      toast.error(getApiError(error, 'Failed to generate PDF'), { id: 'pdf' });
    }
  };

  const handleVerify = async (row) => {
    if (!window.confirm('Verify this inspection? This confirms the recorded scores.')) return;
    try {
      await dispatch(verifyInspection(row.id)).unwrap();
      toast.success('Inspection verified');
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to verify inspection'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete inspection from ${row.inspectionDate ? new Date(row.inspectionDate).toLocaleDateString() : '—'}? This cannot be undone.`)) return;
    try {
      await dispatch(deleteInspection(row.id)).unwrap();
      toast.success('Inspection deleted');
      tableRef.current?.refresh();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete inspection'));
    }
  };

  const columns = [
    {
      title: 'Date',
      field: 'inspectionDate',
      width: 120,
      sorter: 'date',
      formatter: dateFormatter,
    },
    {
      title: 'Field',
      field: 'fieldId',
      minWidth: 180,
      formatter: fieldRefFormatter,
    },
    {
      title: 'Inspector',
      field: 'inspectorId',
      width: 150,
      formatter: userFormatter,
    },
    rangeColumn('pitchQualityScore.total', 'PQS', {
      width: 170,
      filterField: 'pitchQualityScore',
      formatter: scoreFormatter,
    }),
    {
      title: 'Tier',
      field: 'pitchQualityScore.tier',
      width: 130,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(['excellent', 'good', 'acceptable', 'poor']),
      headerFilterMap: (value) => {
        const range = TIER_RANGES[value];
        const out = {};
        if (range?.gte !== undefined) out.pitchQualityScore__gte = range.gte;
        if (range?.lte !== undefined) out.pitchQualityScore__lte = range.lte;
        return out;
      },
      formatter: tierBadge,
    },
    {
      title: 'Status',
      field: 'status',
      width: 140,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(INSPECTION_STATUSES),
      formatter: statusBadge,
    },
  ];

  const actions = [
    {
      label: 'View',
      icon: 'eye',
      onClick: (row) => navigate(`/inspections/${row.id}`),
    },
    ...(can('inspection.update')
      ? [
          {
            label: 'Edit',
            icon: 'pencil',
            color: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50',
            show: (row) => row.status === 'draft',
            onClick: (row) => navigate(`/inspections/new?edit=${row.id}`),
          },
        ]
      : []),
    ...(canVerify
      ? [
          {
            label: 'Verify',
            icon: 'check',
            color: 'text-slate-500 hover:text-green-600 hover:bg-green-50',
            show: (row) => row.status === 'submitted',
            onClick: handleVerify,
          },
        ]
      : []),
    ...(can('inspection.delete')
      ? [
          {
            label: 'Delete',
            icon: 'trash',
            color: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
            onClick: handleDelete,
          },
        ]
      : []),
    {
      label: 'Download PDF',
      icon: 'download',
      color: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
      show: (row) => ['submitted', 'verified'].includes(row.status),
      onClick: downloadPdf,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inspections</h1>
          <p className="text-slate-500 mt-1">View and manage all turf inspections</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/inspections/new')}>
            <Plus className="w-5 h-5 mr-2" />
            New Inspection
          </Button>
        )}
      </div>

      <DataTable
        ref={tableRef}
        url="/inspections"
        columns={columns}
        searchable={{ placeholder: 'Search inspections…' }}
        exportFileName="inspections"
        initialSort={[{ field: 'inspectionDate', dir: 'desc' }]}
        rowClick={(row) => navigate(`/inspections/${row.id}`)}
        placeholder="No inspections yet — click “New Inspection” to create one."
        actions={actions}
      />
    </div>
  );
};

export default Inspections;