import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import { getField } from '../../store/slices/fieldSlice';
import DataTable from '../../components/datatable/DataTable';
import { Badge, ErrorState, EmptyState } from '../../components/ui';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  statusBadge,
  tierBadge,
  scoreFormatter,
  dateFormatter,
  userFormatter,
  enumFilterParams,
} from '../../components/datatable/columns';
import { formatDate, titleCase, tierMeta } from '../../utils/format';

const INSPECTION_STATUSES = ['draft', 'submitted', 'verified'];

const FieldDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentField, loading, error } = useSelector((state) => state.fields);
  const inspectionsRef = useRef(null);

  useEffect(() => {
    dispatch(getField(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  const columns = [
    {
      title: 'Date',
      field: 'inspectionDate',
      width: 120,
      sorter: 'date',
      formatter: dateFormatter,
    },
    {
      title: 'Inspector',
      field: 'inspectorId',
      width: 160,
      formatter: userFormatter,
    },
    {
      title: 'PQS',
      field: 'pitchQualityScore.total',
      width: 170,
      sorter: 'number',
      formatter: scoreFormatter,
    },
    {
      title: 'Tier',
      field: 'pitchQualityScore.tier',
      width: 120,
      headerFilter: 'select',
      headerFilterParams: enumFilterParams(['excellent', 'good', 'acceptable', 'poor']),
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

  if (loading && !currentField) return <LoadingSpinner text="Loading field…" />;
  if (error) return <ErrorState message={error} onRetry={() => dispatch(getField(id))} />;
  if (!currentField) return <ErrorState message="Field not found" onRetry={() => navigate('/fields')} />;

  const score = currentField.currentScore;
  const scoreMeta = tierMeta(score?.tier);
  const addr = currentField.address;
  const addressText =
    typeof addr === 'string' ? addr : addr ? [addr.area, addr.city, addr.country].filter(Boolean).join(', ') : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/fields')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{currentField.name}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="font-mono text-sm">{currentField.fieldId}</span>
            <span className="text-slate-300">•</span>
            <span className="text-sm">{titleCase(currentField.sportType)} • {titleCase(currentField.turfType)}</span>
          </p>
        </div>
        <Badge variant={currentField.status === 'active' ? 'success' : currentField.status === 'under_maintenance' ? 'warning' : 'default'}>
          {titleCase(currentField.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{currentField.name}</h2>
                  <p className="text-slate-500">{addressText || 'No address on file'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Sport Type</p>
                <p className="font-medium text-slate-900 capitalize">{titleCase(currentField.sportType)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Turf Type</p>
                <p className="font-medium text-slate-900 capitalize">{titleCase(currentField.turfType)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Dimensions</p>
                <p className="font-medium text-slate-900">
                  {currentField.dimensions?.lengthM}m × {currentField.dimensions?.widthM}m
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Drainage</p>
                <p className="font-medium text-slate-900">{titleCase(currentField.drainageType) || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Grass Species</p>
                <p className="font-medium text-slate-900">{titleCase(currentField.grassSpecies) || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Created</p>
                <p className="font-medium text-slate-900">{formatDate(currentField.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Inspections</h3>
              <button
                onClick={() => navigate(`/inspections/new?field=${id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Inspection
              </button>
            </div>
            <DataTable
              ref={inspectionsRef}
              url="/inspections"
              columns={columns}
              ajaxParams={{ fieldId: id }}
              initialSort={[{ field: 'inspectionDate', dir: 'desc' }]}
              exportFileName={`inspections-${currentField.fieldId || 'field'}`}
              rowClick={(row) => navigate(`/inspections/${row.id}`)}
              placeholder="No inspections recorded for this field yet."
            />
          </div>
        </div>

        <div className="space-y-6">
          {score ? (
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-4">Latest Score</h3>
              <div className="text-center">
                <p className={`text-5xl font-bold ${scoreMeta.color.replace('bg-', 'text-').replace('-100', '-600')}`}>
                  {score.total}
                </p>
                <p className="text-sm text-slate-500 mt-1">out of 100</p>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${scoreMeta.color}`}>
                    {scoreMeta.label}
                  </span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Last inspected</p>
                <p className="font-medium text-slate-900">{formatDate(score.lastInspectionDate)}</p>
              </div>
            </div>
          ) : (
            <EmptyState title="No score yet" description="Complete an inspection to generate a pitch quality score." />
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldDetail;