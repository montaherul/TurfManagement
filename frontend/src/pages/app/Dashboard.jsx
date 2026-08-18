import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Wallet,
  Clock,
  Ban,
  CheckCircle2,
  UserX,
  Gamepad2,
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { resourceService } from '../../services/resourceService';
import { useSelector } from 'react-redux';

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  NO_SHOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

const fmt = (amount) => `৳${Number(amount || 0).toLocaleString('en-IN')}`;

const StatCard = ({ icon: Icon, label, value, tone = 'bg-primary-50 text-primary-700' }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await bookingService.listMine({ limit: 20 });
        setBookings(payload.data.data);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-6">My bookings</h1>
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No bookings yet. Find a facility and book a slot!</p>
          <Link to="/" className="inline-block mt-4 text-sm font-medium text-primary-600 hover:underline">
            Browse facilities →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{b.bookingNo}</p>
                <p className="text-sm text-slate-500">
                  {b.resource?.name || b.resourceName} · {b.date} · {String(b.startTime).slice(0, 5)} – {String(b.endTime).slice(0, 5)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">{fmt(b.totalAmount)}</span>
                <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_STYLES[b.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.role === 'booker') {
    return (
      <div className="max-w-3xl mx-auto">
        <MyBookings />
      </div>
    );
  }

  const [today, setToday] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [resourceCount, setResourceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [t, p, w, r] = await Promise.all([
        bookingService.today(),
        paymentService.pending(),
        paymentService.wallet(),
        resourceService.listAll(),
      ]);
      setToday(t.data.bookings || []);
      setPendingCount((p.data.payments || []).length);
      setWallet(w.data.wallet);
      setResourceCount((r.data.resources || []).length);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const act = async (fn, id, label, success) => {
    setBusy(id);
    try {
      await fn(id);
      toast.success(success);
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Today's bookings" value={today.length} />
        <StatCard icon={Clock} label="Active grounds" value={resourceCount} tone="bg-emerald-50 text-emerald-700" />
        <StatCard icon={Wallet} label="Wallet balance" value={wallet ? fmt(wallet.totalCollected - wallet.platformFees) : '—'} tone="bg-sky-50 text-sky-700" />
        <StatCard icon={Ban} label="Pending verifications" value={pendingCount} tone="bg-amber-50 text-amber-700" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Today&apos;s schedule</h2>
          <Link to="/app/bookings" className="text-sm text-primary-600 font-medium hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : today.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No bookings today yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {today.map((b) => (
              <div key={b.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="w-16 text-center">
                  <p className="font-bold text-slate-900">{String(b.startTime).slice(0, 5)}</p>
                  <p className="text-xs text-slate-400">{String(b.endTime).slice(0, 5)}</p>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-slate-900">{b.customerName || b.mobile}</p>
                  <p className="text-sm text-slate-500">
                    {b.mobile} · {b.resource?.name || '—'} · {b.bookingNo}
                  </p>
                </div>
                <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_STYLES[b.status] || ''}`}>
                  {b.status}
                </span>
                <div className="flex gap-2">
                  {b.status === 'PENDING' && (
                    <button
                      onClick={() => act(bookingService.cancel, b.id, 'Cancel', 'Booking cancelled')}
                      disabled={busy === b.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => act(bookingService.checkIn, b.id, 'Check-in', 'Checked in')}
                        disabled={busy === b.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Check in
                      </button>
                      <button
                        onClick={() => act(bookingService.markNoShow, b.id, 'No-show', 'Marked as no-show')}
                        disabled={busy === b.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" /> No-show
                      </button>
                    </>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => act(bookingService.complete, b.id, 'Complete', 'Booking completed')}
                      disabled={busy === b.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;