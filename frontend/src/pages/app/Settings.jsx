import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';
import { facilityService } from '../../services/facilityService';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const Settings = () => {
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    description: '',
    address: { line: '', area: '', city: '' },
    bkashNumber: '',
    nagadNumber: '',
    facebookUrl: '',
    operatingHours: {},
    cancellationPolicy: { noticeHours: 3, fullRefundHours: 6, partialRefundPercent: 50 },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await facilityService.getMine();
        const f = payload.data.facility;
        setFacility(f);
        setForm({
          name: f.name || '',
          phone: f.phone || '',
          email: f.email || '',
          description: f.description || '',
          address: {
            line: f.address?.line || f.address?.street || '',
            area: f.address?.area || f.address?.city || '',
            city: f.address?.city || '',
          },
          bkashNumber: f.bkashNumber || '',
          nagadNumber: f.nagadNumber || '',
          facebookUrl: f.facebookUrl || '',
          operatingHours: f.operatingHours || {},
          cancellationPolicy: f.cancellationPolicy || form.cancellationPolicy,
        });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load facility');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setAddress = (field, value) => setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  const setDay = (day, field, value) =>
    setForm((prev) => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [day]: { ...(prev.operatingHours[day] || {}), [field]: value } },
    }));
  const setPolicy = (field, value) =>
    setForm((prev) => ({ ...prev, cancellationPolicy: { ...prev.cancellationPolicy, [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = await facilityService.updateProfile(form);
      setFacility(payload.data.facility);
      toast.success('Facility profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update facility');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />;
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Facility settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{facility?.name}</h2>
            <p className="text-xs text-slate-400">Status: {facility?.status} · Slug: {facility?.slug}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Facility name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Location &amp; contact</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Street / line</label>
            <input value={form.address.line} onChange={(e) => setAddress('line', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Area</label>
            <input value={form.address.area} onChange={(e) => setAddress('area', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input value={form.address.city} onChange={(e) => setAddress('city', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>bKash number</label>
            <input value={form.bkashNumber} onChange={(e) => set('bkashNumber', e.target.value)} placeholder="01XXXXXXXXX" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nagad number</label>
            <input value={form.nagadNumber} onChange={(e) => set('nagadNumber', e.target.value)} placeholder="01XXXXXXXXX" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Facebook URL</label>
            <input value={form.facebookUrl} onChange={(e) => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/…" className={inputClass} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Operating hours</h2>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const day = form.operatingHours[d] || {};
            return (
              <div key={d} className="flex flex-wrap items-center gap-3">
                <span className="w-12 text-sm font-medium text-slate-700">{d}</span>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={!day.closed}
                    onChange={(e) => setDay(d, 'closed', !e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Open
                </label>
                {!day.closed && (
                  <>
                    <input
                      type="time"
                      value={day.open || '08:00'}
                      onChange={(e) => setDay(d, 'open', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={day.close || '23:00'}
                      onChange={(e) => setDay(d, 'close', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Cancellation policy</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Notice hours</label>
            <input
              type="number"
              min={0}
              value={form.cancellationPolicy.noticeHours}
              onChange={(e) => setPolicy('noticeHours', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Full refund within (hours)</label>
            <input
              type="number"
              min={0}
              value={form.cancellationPolicy.fullRefundHours}
              onChange={(e) => setPolicy('fullRefundHours', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Partial refund %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.cancellationPolicy.partialRefundPercent}
              onChange={(e) => setPolicy('partialRefundPercent', Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;