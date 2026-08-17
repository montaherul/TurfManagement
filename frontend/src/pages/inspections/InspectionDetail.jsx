import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Download, Send, CheckCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getInspection, submitInspection, verifyInspection } from '../../store/slices/inspectionSlice';
import { inspectionService } from '../../services/inspectionService';
import { Badge, ErrorState, EmptyState, Button } from '../../components/ui';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate, formatDateTime, titleCase, tierMeta } from '../../utils/format';
import { getApiError } from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';

const SectionCard = ({ title, children }) => (
  <div className="bg-white rounded-2xl p-6 shadow-card">
    <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
    {children}
  </div>
);

const ScoreBreakdown = ({ score }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    {[
      { label: 'Surface', value: score.surfaceScore },
      { label: 'Soil', value: score.soilScore },
      { label: 'Structural', value: score.structuralScore },
      { label: 'Grass Health', value: score.grassScore },
      { label: 'Maintenance', value: score.maintenanceScore },
    ].map((item) => (
      <div key={item.label} className="bg-slate-50 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{item.value ?? '—'}</p>
        <p className="text-xs text-slate-500 mt-1">{item.label}</p>
      </div>
    ))}
  </div>
);

const MeterCard = ({ label, value, suffix = '' }) => (
  <div className="bg-slate-50 rounded-xl p-4">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="text-lg font-semibold text-slate-900">
      {value != null ? `${value}${suffix}` : '—'}
    </p>
  </div>
);

const NotesList = ({ title, items }) => {
  const list = Array.isArray(items) ? items.filter(Boolean) : items ? [items] : [];
  return list.length ? (
    <div className="mt-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-2">
        {list.map((item, i) => (
          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  ) : null;
};

const InspectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentInspection, loading, error } = useSelector((state) => state.inspections);
  const { can } = usePermissions();
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(getInspection(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  if (loading && !currentInspection) return <LoadingSpinner text="Loading inspection…" />;
  if (error) return <ErrorState message={error} onRetry={() => dispatch(getInspection(id))} />;
  if (!currentInspection) return <ErrorState message="Inspection not found" onRetry={() => navigate('/inspections')} />;

  const inspection = currentInspection;
  const score = inspection.pitchQualityScore || {};
  const meta = tierMeta(score.tier);
  const isDraft = inspection.status === 'draft';
  const isSubmitted = inspection.status === 'submitted';
  const canSubmit = isDraft && can('inspection.update');
  const canVerify = isSubmitted && can('inspection.verify');

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      await dispatch(submitInspection(id)).unwrap();
      toast.success('Inspection submitted for review');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to submit inspection'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!window.confirm('Verify this inspection? This confirms the recorded scores.')) return;
    setActionLoading(true);
    try {
      await dispatch(verifyInspection(id)).unwrap();
      toast.success('Inspection verified');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to verify inspection'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading('Generating PDF…', { id: 'pdf' });
      const blob = await inspectionService.getInspectionPdf(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inspection-${inspection.id || id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch (err) {
      toast.error(getApiError(err, 'Failed to generate PDF'), { id: 'pdf' });
    }
  };

  const statusSteps = ['draft', 'submitted', 'verified'];
  const statusIndex = statusSteps.indexOf(inspection.status);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/inspections')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inspection Details</h1>
            <p className="text-slate-500 mt-1">{inspection.field?.name || 'Unknown field'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canSubmit && (
            <Button onClick={handleSubmit} loading={actionLoading}>
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {canVerify && (
            <Button variant="success" onClick={handleVerify} loading={actionLoading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify
            </Button>
          )}
          {!isDraft && (
            <Button variant="secondary" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Tier banner */}
      <div className={`rounded-2xl p-6 shadow-card ${meta.color}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium opacity-80">Pitch Quality Score</p>
            <p className="text-5xl font-bold">{score.total ?? '—'} / 100</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{meta.label}</p>
            <p className="text-sm opacity-80">{formatDate(inspection.inspectionDate)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Score Breakdown">
            <ScoreBreakdown score={score} />
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
              <FileText className="w-4 h-4" />
              Inspected by {[inspection.inspector?.firstName, inspection.inspector?.lastName].filter(Boolean).join(' ') || 'Unknown'}
              {inspection.field && (
                <>
                  <span className="text-slate-300">•</span>
                  {inspection.field.fieldId}
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Weather Conditions">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MeterCard label="Temperature" value={inspection.weatherConditions?.temperature} suffix="°C" />
              <MeterCard label="Humidity" value={inspection.weatherConditions?.humidity} suffix="%" />
              <MeterCard label="Rainfall (24h)" value={inspection.weatherConditions?.rainfallLast24h} suffix="mm" />
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Cloud Cover</p>
                <p className="text-lg font-semibold text-slate-900 capitalize">
                  {titleCase(inspection.weatherConditions?.cloudCover)}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Surface Assessment">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MeterCard label="Grass Cover" value={inspection.surfaceAssessment?.grassCoverPercent} suffix="%" />
              <MeterCard label="Color Uniformity" value={inspection.surfaceAssessment?.colorUniformity} suffix="/5" />
              <MeterCard label="Weed Presence" value={titleCase(inspection.surfaceAssessment?.weedPresence)} />
              <MeterCard label="Pest Damage" value={titleCase(inspection.surfaceAssessment?.pestDamage)} />
            </div>
            <NotesList title="Notes" items={inspection.surfaceAssessment?.notes} />
          </SectionCard>

          <SectionCard title="Soil Assessment">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MeterCard label="Moisture" value={inspection.soilAssessment?.moistureContent} suffix="%" />
              <MeterCard label="Compaction" value={inspection.soilAssessment?.compactionKgCm2} suffix=" kg/cm²" />
              <MeterCard label="pH" value={inspection.soilAssessment?.ph} />
              <MeterCard label="Temperature" value={inspection.soilAssessment?.temperature} suffix="°C" />
            </div>
            <NotesList title="Notes" items={inspection.soilAssessment?.notes} />
          </SectionCard>

          <SectionCard title="Structural Assessment">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MeterCard label="Surface Evenness" value={inspection.structuralAssessment?.surfaceEvennessMm} suffix="mm" />
              <MeterCard label="Drainage Rate" value={inspection.structuralAssessment?.drainageRateMinutes} suffix="min" />
              <MeterCard label="Thatch Depth" value={inspection.structuralAssessment?.thatchDepthMm} suffix="mm" />
            </div>
            <NotesList title="Notes" items={inspection.structuralAssessment?.notes} />
          </SectionCard>

          <SectionCard title="Grass Health">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MeterCard label="Color Rating" value={inspection.grassHealth?.colorRating} suffix="/5" />
              <MeterCard label="Disease Rating" value={inspection.grassHealth?.diseaseRating} suffix="/5" />
              <MeterCard label="Pest Rating" value={inspection.grassHealth?.pestRating} suffix="/5" />
              <MeterCard label="Overall" value={inspection.grassHealth?.overallScore} suffix="/20" />
            </div>
            <NotesList title="Notes" items={inspection.grassHealth?.notes} />
          </SectionCard>

          {inspection.recommendations?.length > 0 && (
            <SectionCard title="Recommendations">
              <ul className="space-y-3">
                {inspection.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary-700">{index + 1}</span>
                    </div>
                    <p className="text-slate-700">{rec}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {inspection.photographs?.length > 0 && (
            <SectionCard title="Photos">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {inspection.photographs.map((photo, i) => (
                  <a key={i} href={photo} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-100">
                    <img src={photo} alt={`Inspection photo ${i + 1}`} className="w-full h-32 object-cover hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Status Timeline">
            <div className="space-y-0">
              {statusSteps.map((step, index) => {
                const done = index <= statusIndex;
                const current = index === statusIndex;
                return (
                  <div key={step} className="flex items-start gap-3 relative pb-6 last:pb-0">
                    {index < statusSteps.length - 1 && (
                      <div className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${index < statusIndex ? 'bg-success-500' : 'bg-slate-200'}`} />
                    )}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        done ? 'bg-success-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {done ? '✓' : index + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${current ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                        {titleCase(step)}
                      </p>
                      {current && <p className="text-xs text-slate-400 mt-0.5">Current status</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            {inspection.verifiedAt && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Verified at</p>
                <p className="font-medium text-slate-900">{formatDateTime(inspection.verifiedAt)}</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Overview">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Field</p>
                <p className="font-medium text-slate-900">{inspection.field?.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Inspection Date</p>
                <p className="font-medium text-slate-900">{formatDate(inspection.inspectionDate)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge
                  variant={
                    inspection.status === 'verified'
                      ? 'success'
                      : inspection.status === 'submitted'
                        ? 'info'
                        : 'default'
                  }
                >
                  {titleCase(inspection.status)}
                </Badge>
              </div>
              {inspection.createdAt && (
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium text-slate-900">{formatDateTime(inspection.createdAt)}</p>
                </div>
              )}
            </div>
          </SectionCard>

          {!inspection.photos && !inspection.photographs && (
            <EmptyState title="No photos" description="Photos attached to this inspection will appear here." />
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionDetail;