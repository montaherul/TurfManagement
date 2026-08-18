import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { slotService } from '../../services/slotService';
import { resourceService } from '../../services/resourceService';

const STATUS_STYLES = {
  AVAILABLE: 'bg-green-50 text-green-700 border-green-200',
  BOOKED: 'bg-red-50 text-red-600 border-red-200',
  BLOCKED: 'bg-slate-100 text-slate-500 border-slate-200',
  MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
};

const Slots = () => {
  const [resources, setResources] = useState([]);
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await resourceService.listAll();
        const list = payload.data.resources || [];
        setResources(list);
        if (list.length && !resourceId) setResourceId(list[0].id);
      } catch {
        setResources([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!resourceId || !date) return;
    const loadSlots = async () => {
      setLoading(true);
      try {
        const payload = await slotService.listForFacility({ date, resourceId });
        setSlots(payload.data.slots || []);
      } catch {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };
    loadSlots();
  }, [resourceId, date]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payload = await slotService.generate(date);
      toast.success(`Generated ${payload.data.generated || 0} new slots`);
      const fresh = await slotService.listForFacility({ date, resourceId });
      setSlots(fresh.data.slots || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await slotService.updateStatus(id, status);
      toast.success('Slot updated');
      const fresh = await slotService.listForFacility({ date, resourceId });
      setSlots(fresh.data.slots || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Slots</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" /> {generating ? 'Generating…' : 'Generate slots'}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Resource</label>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No slots for this date. Generate slots to open the schedule.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {slots.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-3 text-center transition-all ${STATUS_STYLES[s.status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}
            >
              <p className="text-sm font-bold">{String(s.startTime).slice(0, 5)}</p>
              <p className="text-xs opacity-80 mt-0.5">৳{s.isPeak ? s.peakPrice : s.price}</p>
              {s.isPeak && <p className="text-[10px] mt-0.5 opacity-70">peak</p>}
              {s.status === 'AVAILABLE' && (
                <button
                  onClick={() => setStatus(s.id, 'BLOCKED')}
                  className="mt-2 text-[10px] px-2 py-1 rounded bg-white/70 border border-slate-200 hover:bg-white"
                >
                  Block
                </button>
              )}
              {s.status === 'BLOCKED' && (
                <button
                  onClick={() => setStatus(s.id, 'AVAILABLE')}
                  className="mt-2 text-[10px] px-2 py-1 rounded bg-white/70 border border-slate-200 hover:bg-white"
                >
                  Open
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Slots;