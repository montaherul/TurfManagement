import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, UserX, Search } from 'lucide-react';
import { bookingService } from '../../services/bookingService';

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  NO_SHOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

const fmt = (amount) => `৳${Number(amount || 0).toLocaleString('en-IN')}`;

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await bookingService.listForFacility({
        status: status || undefined,
        search: search || undefined,
        date: date || undefined,
        page,
        limit: 15,
      });
      setBookings(payload.data.data);
      setTotalPages(payload.data.pagination?.totalPages || 1);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, date, page]);

  const act = async (fn, id, label, success) => {
    setBusy(id);
    try {
      await fn(id);
      toast.success(success);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const doCancel = async (b) => {
    const reason = window.prompt(`Reason for cancelling ${b.bookingNo}?`);
    if (reason === null) return;
    act(bookingService.cancel, b.id, 'Cancel', 'Booking cancelled');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search booking/customer…"
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500 w-56"
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : bookings.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No bookings match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Resource</th>
                  <th className="px-5 py-3 font-medium">Date &amp; time</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{b.bookingNo}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{b.customerName || '—'}</p>
                      <p className="text-xs text-slate-400">{b.mobile}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{b.resource?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {b.date}
                      <br />
                      <span className="text-xs text-slate-400">{String(b.startTime).slice(0, 5)} – {String(b.endTime).slice(0, 5)}</span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{fmt(b.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_STYLES[b.status] || ''}`}>{b.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {b.status === 'PENDING' && (
                          <button onClick={() => doCancel(b)} disabled={busy === b.id} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50" title="Cancel">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button onClick={() => act(bookingService.checkIn, b.id, 'Check-in', 'Checked in')} disabled={busy === b.id} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" title="Check in">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => act(bookingService.markNoShow, b.id, 'No-show', 'Marked no-show')} disabled={busy === b.id} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50" title="No-show">
                              <UserX className="w-4 h-4" />
                            </button>
                            <button onClick={() => act(bookingService.complete, b.id, 'Complete', 'Booking completed')} disabled={busy === b.id} className="px-2.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50">
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 py-4 border-t border-slate-100">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40">
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;