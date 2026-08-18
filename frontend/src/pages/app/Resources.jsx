import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, MapPin, Clock, DollarSign } from 'lucide-react';
import { resourceService } from '../../services/resourceService';
import Modal from '../../components/ui/Modal';

const TYPES = ['TURF', 'BADMINTON', 'POOL', 'SNOOKER', 'CRICKET', 'BASKETBALL', 'TENNIS', 'OTHER'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const emptyForm = () => ({
  name: '',
  type: 'TURF',
  capacity: 10,
  basePrice: 1000,
  description: '',
  scheduleTemplate: {
    startTime: '08:00',
    endTime: '23:00',
    stepMinutes: 60,
    days: [...DAYS],
    peakRanges: [],
  },
});

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await resourceService.list({ limit: 50 });
      setResources(payload.data.data);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      basePrice: r.basePrice,
      description: '',
      scheduleTemplate: r.scheduleTemplate || emptyForm().scheduleTemplate,
    });
    setModalOpen(true);
  };

  const toggleDay = (d) => {
    setForm((f) => {
      const days = f.scheduleTemplate.days.includes(d)
        ? f.scheduleTemplate.days.filter((x) => x !== d)
        : [...f.scheduleTemplate.days, d];
      return { ...f, scheduleTemplate: { ...f.scheduleTemplate, days } };
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.basePrice) {
      toast.error('Name and price are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await resourceService.update(editing.id, form);
        toast.success('Resource updated');
      } else {
        await resourceService.create(form);
        toast.success('Resource created — slots will be generated automatically');
      }
      setModalOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await resourceService.remove(id);
      toast.success('Resource deleted');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete resource');
    } finally {
      setDeleting(null);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Resources</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add resource
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500">
          No resources yet. Add your first ground or court.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{r.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{r.type}</p>
                </div>
                <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${r.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {r.status}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" /> ৳{r.basePrice} / hour
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> {r.scheduleTemplate?.startTime} – {r.scheduleTemplate?.endTime} · {r.scheduleTemplate?.stepMinutes}m
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> Capacity {r.capacity}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit resource' : 'Add resource'}>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main 5v5 Turf" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Base price (BDT/hour) *</label>
              <input type="number" min={1} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Slot step (minutes)</label>
              <select
                value={form.scheduleTemplate.stepMinutes}
                onChange={(e) => setForm({ ...form, scheduleTemplate: { ...form.scheduleTemplate, stepMinutes: Number(e.target.value) } })}
                className={inputClass}
              >
                {[30, 60, 90, 120].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Open time</label>
              <input type="time" value={form.scheduleTemplate.startTime} onChange={(e) => setForm({ ...form, scheduleTemplate: { ...form.scheduleTemplate, startTime: e.target.value } })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Close time</label>
              <input type="time" value={form.scheduleTemplate.endTime} onChange={(e) => setForm({ ...form, scheduleTemplate: { ...form.scheduleTemplate, endTime: e.target.value } })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Open days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${form.scheduleTemplate.days.includes(d) ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create resource'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Resources;