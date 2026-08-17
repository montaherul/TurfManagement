import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Send, Save, X, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { getFields } from '../../store/slices/fieldSlice';
import { createInspection, submitInspection, getInspection, updateInspection } from '../../store/slices/inspectionSlice';
import { uploadService } from '../../services/uploadService';
import { Button, Select, Input, TextArea } from '../../components/ui';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate, titleCase } from '../../utils/format';
import { getApiError } from '../../utils/api';

const CLOUD_COVERS = ['clear', 'partly_cloudy', 'overcast', 'rainy'];
const LEVELS = ['none', 'low', 'medium', 'high'];
const RATING_OPTIONS = [1, 2, 3, 4, 5];

const STEPS = ['General Info', 'Surface', 'Soil', 'Structure', 'Review'];

const NewInspection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit') || null;
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState(null);
  const [form, setForm] = useState({
    fieldId: searchParams.get('field') || '',
    inspectionDate: new Date().toISOString().split('T')[0],
    weatherConditions: { temperature: '', humidity: '', rainfallLast24h: 0, cloudCover: 'clear' },
    surfaceAssessment: { grassCoverPercent: '', colorUniformity: '', weedPresence: 'none', pestDamage: 'none', diseaseSigns: 'none', notes: '' },
    soilAssessment: { moistureContent: '', compactionKgCm2: '', ph: '', temperature: '', notes: '' },
    structuralAssessment: { surfaceEvennessMm: '', drainageRateMinutes: '', thatchDepthMm: '', notes: '' },
    grassHealth: { colorRating: 3, diseaseRating: 3, pestRating: 3, overallScore: '', notes: '' },
    recommendations: [],
  });

  useEffect(() => {
    dispatch(getFields({ page: 1, limit: 100 }))
      .unwrap()
      .then((payload) => setFields(payload.data || []))
      .catch((err) => setFieldsError(err))
      .finally(() => setFieldsLoading(false));
  }, [dispatch]);

  useEffect(() => {
    if (!editId) return;
    dispatch(getInspection(editId))
      .unwrap()
      .then((payload) => {
        const inspection = payload.inspection;
        if (!inspection || inspection.status !== 'draft') {
          toast.error('Only draft inspections can be edited');
          navigate('/inspections');
          return;
        }
        setForm({
          fieldId: inspection.fieldId || '',
          inspectionDate: inspection.inspectionDate ? inspection.inspectionDate.slice(0, 10) : new Date().toISOString().split('T')[0],
          weatherConditions: {
            temperature: inspection.weatherConditions?.temperature ?? '',
            humidity: inspection.weatherConditions?.humidity ?? '',
            rainfallLast24h: inspection.weatherConditions?.rainfallLast24h ?? 0,
            cloudCover: inspection.weatherConditions?.cloudCover || 'clear',
          },
          surfaceAssessment: {
            grassCoverPercent: inspection.surfaceAssessment?.grassCoverPercent ?? '',
            colorUniformity: inspection.surfaceAssessment?.colorUniformity ?? '',
            weedPresence: inspection.surfaceAssessment?.weedPresence || 'none',
            pestDamage: inspection.surfaceAssessment?.pestDamage || 'none',
            diseaseSigns: inspection.surfaceAssessment?.diseaseSigns || 'none',
            notes: inspection.surfaceAssessment?.notes || '',
          },
          soilAssessment: {
            moistureContent: inspection.soilAssessment?.moistureContent ?? '',
            compactionKgCm2: inspection.soilAssessment?.compactionKgCm2 ?? '',
            ph: inspection.soilAssessment?.ph ?? '',
            temperature: inspection.soilAssessment?.temperature ?? '',
            notes: inspection.soilAssessment?.notes || '',
          },
          structuralAssessment: {
            surfaceEvennessMm: inspection.structuralAssessment?.surfaceEvennessMm ?? '',
            drainageRateMinutes: inspection.structuralAssessment?.drainageRateMinutes ?? '',
            thatchDepthMm: inspection.structuralAssessment?.thatchDepthMm ?? '',
            notes: inspection.structuralAssessment?.notes || '',
          },
          grassHealth: {
            colorRating: inspection.grassHealth?.colorRating ?? 3,
            diseaseRating: inspection.grassHealth?.diseaseRating ?? 3,
            pestRating: inspection.grassHealth?.pestRating ?? 3,
            overallScore: inspection.grassHealth?.overallScore ?? '',
            notes: inspection.grassHealth?.notes || '',
          },
          recommendations: inspection.recommendations || [],
        });
        if (Array.isArray(inspection.photos)) setPhotos(inspection.photos);
      })
      .catch((err) => {
        toast.error(getApiError(err, 'Failed to load inspection'));
        navigate('/inspections');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const setNested = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const payload = await uploadService.uploadPhoto(file);
        const url = payload?.data?.url || payload?.url;
        if (url) setPhotos((prev) => [...prev, url]);
      }
      toast.success('Photos uploaded');
    } catch (err) {
      toast.error(getApiError(err, 'Photo upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.fieldId) return 'Please select a field';
      if (!form.inspectionDate) return 'Please choose an inspection date';
    }
    return null;
  };

  const handleNext = () => {
    const problem = validateStep();
    if (problem) {
      toast.error(problem);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const buildPayload = (includeRecommendations = true) => ({
    fieldId: form.fieldId,
    inspectionDate: form.inspectionDate,
    weatherConditions: {
      temperature: Number(form.weatherConditions.temperature) || undefined,
      humidity: Number(form.weatherConditions.humidity) || undefined,
      rainfallLast24h: Number(form.weatherConditions.rainfallLast24h) || 0,
      cloudCover: form.weatherConditions.cloudCover,
    },
    surfaceAssessment: {
      grassCoverPercent: Number(form.surfaceAssessment.grassCoverPercent) || undefined,
      colorUniformity: Number(form.surfaceAssessment.colorUniformity) || undefined,
      weedPresence: form.surfaceAssessment.weedPresence,
      pestDamage: form.surfaceAssessment.pestDamage,
      diseaseSigns: form.surfaceAssessment.diseaseSigns,
      notes: form.surfaceAssessment.notes || undefined,
    },
    soilAssessment: {
      moistureContent: Number(form.soilAssessment.moistureContent) || undefined,
      compactionKgCm2: Number(form.soilAssessment.compactionKgCm2) || undefined,
      ph: form.soilAssessment.ph === '' ? undefined : Number(form.soilAssessment.ph),
      temperature: Number(form.soilAssessment.temperature) || undefined,
      notes: form.soilAssessment.notes || undefined,
    },
    structuralAssessment: {
      surfaceEvennessMm: Number(form.structuralAssessment.surfaceEvennessMm) || undefined,
      drainageRateMinutes: Number(form.structuralAssessment.drainageRateMinutes) || undefined,
      thatchDepthMm: Number(form.structuralAssessment.thatchDepthMm) || undefined,
      notes: form.structuralAssessment.notes || undefined,
    },
    grassHealth: {
      colorRating: Number(form.grassHealth.colorRating) || undefined,
      diseaseRating: Number(form.grassHealth.diseaseRating) || undefined,
      pestRating: Number(form.grassHealth.pestRating) || undefined,
      overallScore: form.grassHealth.overallScore === '' ? undefined : Number(form.grassHealth.overallScore),
      notes: form.grassHealth.notes || undefined,
    },
    ...(includeRecommendations && form.recommendations.length ? { recommendations: form.recommendations } : {}),
  });

  const persist = async (submit = false) => {
    setSaving(true);
    try {
      const payload = buildPayload(submit);
      let inspectionId = editId;
      if (editId) {
        await dispatch(updateInspection({ id: editId, data: payload })).unwrap();
        if (submit && inspectionId) {
          await dispatch(submitInspection(inspectionId)).unwrap();
        }
      } else {
        const result = await dispatch(createInspection(payload)).unwrap();
        inspectionId = result.inspection?.id;
        if (submit && inspectionId) {
          await dispatch(submitInspection(inspectionId)).unwrap();
        }
      }
      toast.success(submit ? 'Inspection submitted successfully' : 'Inspection saved as draft');
      if (inspectionId) {
        navigate(`/inspections/${inspectionId}`);
      } else {
        navigate('/inspections');
      }
    } catch (error) {
      toast.error(getApiError(error, 'Failed to save inspection'));
    } finally {
      setSaving(false);
    }
  };

  const selectedField = fields.find((f) => f.id === form.fieldId);

  const summaryRows = useMemo(() => {
    const rows = [
      ['Field', selectedField?.name || 'Not selected'],
      ['Date', formatDate(form.inspectionDate)],
      ['Temperature', form.weatherConditions.temperature ? `${form.weatherConditions.temperature}°C` : '—'],
      ['Humidity', form.weatherConditions.humidity ? `${form.weatherConditions.humidity}%` : '—'],
      ['Grass Cover', form.surfaceAssessment.grassCoverPercent ? `${form.surfaceAssessment.grassCoverPercent}%` : '—'],
      ['Soil Moisture', form.soilAssessment.moistureContent ? `${form.soilAssessment.moistureContent}%` : '—'],
      ['Soil pH', form.soilAssessment.ph || '—'],
      ['Surface Evenness', form.structuralAssessment.surfaceEvennessMm ? `${form.structuralAssessment.surfaceEvennessMm}mm` : '—'],
      ['Drainage Rate', form.structuralAssessment.drainageRateMinutes ? `${form.structuralAssessment.drainageRateMinutes}min` : '—'],
    ];
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, selectedField]);

  if (loading) return <LoadingSpinner text="Loading inspection…" />;
  if (fieldsLoading) return <LoadingSpinner text="Loading fields…" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/inspections')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{editId ? 'Edit Inspection' : 'New Inspection'}</h1>
          <p className="text-slate-500 mt-1">Complete the inspection form below</p>
        </div>
      </div>

      {fieldsError && (
        <div className="bg-danger-50 text-danger-600 text-sm rounded-xl px-4 py-3">
          Could not load fields: {fieldsError}. Please try again later.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {STEPS.map((stepName, index) => (
              <div key={stepName} className="flex items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > index + 1
                      ? 'bg-success-100 text-success-700'
                      : step === index + 1
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium hidden sm:inline ${step === index + 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                  {stepName}
                </span>
                {index < STEPS.length - 1 && <div className="w-10 md:w-16 h-0.5 bg-slate-200 mx-2 md:mx-4" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">General Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Field"
                  required
                  value={form.fieldId}
                  onChange={(e) => setNested('fieldId', e.target.value)}
                >
                  <option value="">Select a field</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.fieldId})
                    </option>
                  ))}
                </Select>
                <Input
                  label="Inspection Date"
                  type="date"
                  required
                  value={form.inspectionDate}
                  onChange={(e) => setNested('inspectionDate', e.target.value)}
                />
                <Input
                  label="Temperature (°C)"
                  type="number"
                  value={form.weatherConditions.temperature}
                  onChange={(e) => setNested('weatherConditions', { ...form.weatherConditions, temperature: e.target.value })}
                  placeholder="28"
                />
                <Input
                  label="Humidity (%)"
                  type="number"
                  value={form.weatherConditions.humidity}
                  onChange={(e) => setNested('weatherConditions', { ...form.weatherConditions, humidity: e.target.value })}
                  placeholder="75"
                />
                <Input
                  label="Rainfall Last 24h (mm)"
                  type="number"
                  value={form.weatherConditions.rainfallLast24h}
                  onChange={(e) => setNested('weatherConditions', { ...form.weatherConditions, rainfallLast24h: e.target.value })}
                  placeholder="0"
                />
                <Select
                  label="Cloud Cover"
                  value={form.weatherConditions.cloudCover}
                  onChange={(e) => setNested('weatherConditions', { ...form.weatherConditions, cloudCover: e.target.value })}
                >
                  {CLOUD_COVERS.map((c) => (
                    <option key={c} value={c}>{titleCase(c)}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Surface Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Grass Cover (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={form.surfaceAssessment.grassCoverPercent}
                  onChange={(e) => setNested('surfaceAssessment', { ...form.surfaceAssessment, grassCoverPercent: e.target.value })}
                />
                <Input
                  label="Color Uniformity (1-5)"
                  type="number"
                  min="1"
                  max="5"
                  value={form.surfaceAssessment.colorUniformity}
                  onChange={(e) => setNested('surfaceAssessment', { ...form.surfaceAssessment, colorUniformity: e.target.value })}
                />
                <Select
                  label="Weed Presence"
                  value={form.surfaceAssessment.weedPresence}
                  onChange={(e) => setNested('surfaceAssessment', { ...form.surfaceAssessment, weedPresence: e.target.value })}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{titleCase(l)}</option>
                  ))}
                </Select>
                <Select
                  label="Pest Damage"
                  value={form.surfaceAssessment.pestDamage}
                  onChange={(e) => setNested('surfaceAssessment', { ...form.surfaceAssessment, pestDamage: e.target.value })}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{titleCase(l)}</option>
                  ))}
                </Select>
                <Select
                  label="Disease Signs"
                  value={form.surfaceAssessment.diseaseSigns}
                  onChange={(e) => setNested('surfaceAssessment', { ...form.surfaceAssessment, diseaseSigns: e.target.value })}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{titleCase(l)}</option>
                  ))}
                </Select>
                <TextArea
                  label="Notes"
                  value={form.surfaceAssessment.notes}
                  onChange={(e) => setNested('surfaceAssessment', { ...form.surfaceAssessment, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Soil Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Moisture Content (%)"
                  type="number"
                  value={form.soilAssessment.moistureContent}
                  onChange={(e) => setNested('soilAssessment', { ...form.soilAssessment, moistureContent: e.target.value })}
                />
                <Input
                  label="Compaction (kg/cm²)"
                  type="number"
                  step="0.1"
                  value={form.soilAssessment.compactionKgCm2}
                  onChange={(e) => setNested('soilAssessment', { ...form.soilAssessment, compactionKgCm2: e.target.value })}
                />
                <Input
                  label="pH Level"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={form.soilAssessment.ph}
                  onChange={(e) => setNested('soilAssessment', { ...form.soilAssessment, ph: e.target.value })}
                />
                <Input
                  label="Soil Temperature (°C)"
                  type="number"
                  value={form.soilAssessment.temperature}
                  onChange={(e) => setNested('soilAssessment', { ...form.soilAssessment, temperature: e.target.value })}
                />
                <TextArea
                  label="Notes"
                  className="md:col-span-2"
                  value={form.soilAssessment.notes}
                  onChange={(e) => setNested('soilAssessment', { ...form.soilAssessment, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Structural Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Surface Evenness (mm)"
                  type="number"
                  value={form.structuralAssessment.surfaceEvennessMm}
                  onChange={(e) => setNested('structuralAssessment', { ...form.structuralAssessment, surfaceEvennessMm: e.target.value })}
                />
                <Input
                  label="Drainage Rate (minutes)"
                  type="number"
                  value={form.structuralAssessment.drainageRateMinutes}
                  onChange={(e) => setNested('structuralAssessment', { ...form.structuralAssessment, drainageRateMinutes: e.target.value })}
                />
                <Input
                  label="Thatch Depth (mm)"
                  type="number"
                  value={form.structuralAssessment.thatchDepthMm}
                  onChange={(e) => setNested('structuralAssessment', { ...form.structuralAssessment, thatchDepthMm: e.target.value })}
                />
                <TextArea
                  label="Notes"
                  className="md:col-span-2"
                  value={form.structuralAssessment.notes}
                  onChange={(e) => setNested('structuralAssessment', { ...form.structuralAssessment, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Grass Health Ratings (1-5)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'colorRating', label: 'Color' },
                    { key: 'diseaseRating', label: 'Disease' },
                    { key: 'pestRating', label: 'Pest' },
                  ].map((r) => (
                    <div key={r.key}>
                      <label className="block text-sm text-slate-500 mb-2">{r.label}</label>
                      <div className="flex gap-2">
                        {RATING_OPTIONS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setNested('grassHealth', { ...form.grassHealth, [r.key]: n })}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                              form.grassHealth[r.key] >= n ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <TextArea
                  label="Grass Health Notes"
                  className="mt-4"
                  value={form.grassHealth.notes}
                  onChange={(e) => setNested('grassHealth', { ...form.grassHealth, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Review & Submit</h3>
              <div className="bg-slate-50 rounded-xl p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {summaryRows.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Photos</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl hover:border-primary-400 transition-colors cursor-pointer text-sm text-slate-600">
                    {uploading ? <Camera className="w-5 h-5 animate-pulse" /> : <ImagePlus className="w-5 h-5" />}
                    {uploading ? 'Uploading…' : 'Add Photos'}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt={`Upload ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6">
            <Button variant="secondary" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1}>
              Previous
            </Button>
            {step < STEPS.length ? (
              <Button onClick={handleNext}>Next Step</Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => persist(false)} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button onClick={() => persist(true)} loading={saving}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Inspection
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewInspection;