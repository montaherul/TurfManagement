import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { paymentService } from '../../services/paymentService';

const fmt = (amount) => `৳${Number(amount || 0).toLocaleString('en-IN')}`;

const Payments = () => {
  const [tab, setTab] = useState('pending');
  const [payments, setPayments] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const payload = tab === 'pending' ? await paymentService.pending() : await paymentService.list({ limit: 20 });
      setPayments(payload.data.payments || []);
      const w = await paymentService.wallet();
      setWallet(w.data.wallet);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [tab]);

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

  const reject = async (id) => {
    const reason = window.prompt('Reason for rejecting payment?');
    if (reason === null) return;
    act(paymentService.reject, id, 'Reject', 'Payment rejected');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Payments</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-50 text-primary-700">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{wallet ? fmt(wallet.totalCollected) : '—'}</p>
          <p className="text-sm text-slate-500">Total collected</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-2xl font-bold text-slate-900">{wallet ? fmt(wallet.platformFees) : '—'}</p>
          <p className="text-sm text-slate-500">Platform fees</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-2xl font-bold text-slate-900">{wallet ? fmt(wallet.verifiedPayments) : '—'}</p>
          <p className="text-sm text-slate-500">Verified payments</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-2xl font-bold text-slate-900">{wallet ? fmt(wallet.pendingVerifications) : '—'}</p>
          <p className="text-sm text-slate-500">Pending verification</p>
        </div>
      </div>

      <div className="flex gap-1 w-fit bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'pending' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
        >
          Pending verification
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'all' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
        >
          All payments
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : payments.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            {tab === 'pending' ? 'No payments waiting for verification.' : 'No payments yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{p.paymentNo}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.booking?.bookingNo || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.booking?.customerName || p.booking?.mobile || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium border border-slate-200 rounded-full px-2.5 py-1 bg-slate-50 text-slate-600">{p.method}</span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{fmt(p.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${
                        p.status === 'VERIFIED' ? 'bg-green-50 text-green-700 border-green-200' :
                        p.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {p.status === 'PENDING' && (
                          <>
                            <button onClick={() => act(paymentService.verify, p.id, 'Verify', 'Payment verified')} disabled={busy === p.id} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" title="Verify">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => reject(p.id)} disabled={busy === p.id} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50" title="Reject">
                              <XCircle className="w-4 h-4" />
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
      </div>
    </div>
  );
};

export default Payments;