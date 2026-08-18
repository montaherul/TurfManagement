import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Users,
  Wallet,
  Settings2,
  Search,
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const fmt = (amount) => `৳${Number(amount || 0).toLocaleString('en-IN')}`;

const Tabs = ({ tab, setTab }) => {
  const tabs = [
    { id: 'applications', label: 'Applications', icon: Building2 },
    { id: 'facilities', label: 'Facilities', icon: Building2 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'fees', label: 'Fees & revenue', icon: Wallet },
    { id: 'settings', label: 'Platform settings', icon: Settings2 },
  ];
  return (
    <div className="flex flex-wrap gap-1 w-fit bg-slate-100 rounded-lg p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.id ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
        >
          <t.icon className="w-4 h-4" /> {t.label}
        </button>
      ))}
    </div>
  );
};

const Applications = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const payload = await adminService.listFacilities({ status: 'PENDING', limit: 50 });
      setList(payload.data.data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    setBusy(id);
    try {
      await adminService.approve(id);
      toast.success('Application approved — owner credentials created');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval failed');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id) => {
    setBusy(id);
    try {
      await adminService.reject(id, rejectReason);
      toast.success('Application rejected');
      setRejecting(null);
      setRejectReason('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rejection failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {loading ? (
        <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">No pending applications.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {list.map((f) => (
            <div key={f.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-[220px]">
                <p className="font-medium text-slate-900">{f.name}</p>
                <p className="text-xs text-slate-500">
                  {f.type} · {f.address?.line || f.address?.area || f.address?.city || '—'} · Contact {f.phone}
                </p>
                {f.application?.ownerName && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Owner: {f.application.ownerName} ({f.application.ownerEmail})
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {rejecting === f.id ? (
                  <>
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500 w-44"
                    />
                    <button onClick={() => reject(f.id)} disabled={busy === f.id} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60">
                      Confirm
                    </button>
                    <button onClick={() => setRejecting(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => approve(f.id)}
                      disabled={busy === f.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => { setRejectReason(''); setRejecting(f.id); }}
                      disabled={busy === f.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Facilities = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await adminService.listFacilities({ search: search || undefined, limit: 50 });
      setList(payload.data.data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const toggleStatus = async (f) => {
    setBusy(f.id);
    try {
      const next = f.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await adminService.setStatus(f.id, next);
      toast.success(`Facility ${next === 'ACTIVE' ? 'activated' : 'suspended'}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search facilities…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : list.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No facilities found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Facility</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{f.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{f.type}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{f.phone}<br />{f.email || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${
                        f.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                        f.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {f.status === 'ACTIVE' ? (
                        <button
                          onClick={() => toggleStatus(f)}
                          disabled={busy === f.id}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      ) : f.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => toggleStatus(f)}
                          disabled={busy === f.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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

const Customers = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await adminService.listCustomers({ search: search || undefined, limit: 50 });
        setList(payload.data.data);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : list.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{c.firstName} {c.lastName || ''}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.mobile}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString('en-GB')}</td>
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

const Fees = () => {
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await adminService.feeSummary();
        setFees(payload.data.fees);
      } catch {
        setFees(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-2xl font-bold text-slate-900">{fmt(fees?.totalFees)}</p>
          <p className="text-sm text-slate-500">Total platform fees</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-2xl font-bold text-slate-900">{fmt(fees?.totalPayments)}</p>
          <p className="text-sm text-slate-500">Total payments collected</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-2xl font-bold text-slate-900">{fees?.byFacility?.length || 0}</p>
          <p className="text-sm text-slate-500">Facilities with activity</p>
        </div>
      </div>

      {fees?.byFacility?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Facility</th>
                  <th className="px-5 py-3 font-medium">Fees</th>
                  <th className="px-5 py-3 font-medium">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fees.byFacility.map((f) => (
                  <tr key={f.facilityId} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{f.facilityName}</td>
                    <td className="px-5 py-3.5 text-slate-600">{fmt(f.fees)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{fmt(f.payments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const PlatformSettings = () => {
  const [settings, setSettings] = useState({ platformFee: 15, smsProvider: 'none', refundNoticeHours: 3 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await adminService.getSettings();
        setSettings(payload.data.settings);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = await adminService.setSettings(settings);
      setSettings(payload.data.settings);
      toast.success('Platform settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />;

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Platform fee (BDT per booking)</label>
          <input
            type="number"
            min={0}
            value={settings.platformFee}
            onChange={(e) => setSettings({ ...settings, platformFee: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">SMS provider</label>
          <select
            value={settings.smsProvider}
            onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
            className={inputClass}
          >
            <option value="none">None (dev mode — OTP shown in response)</option>
            <option value="smpp">SMPP gateway</option>
            <option value="twilio">Twilio</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Refund notice hours</label>
          <input
            type="number"
            min={0}
            value={settings.refundNoticeHours}
            onChange={(e) => setSettings({ ...settings, refundNoticeHours: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [tab, setTab] = useState('applications');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Platform admin</h1>
      </div>
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'applications' && <Applications />}
      {tab === 'facilities' && <Facilities />}
      {tab === 'customers' && <Customers />}
      {tab === 'fees' && <Fees />}
      {tab === 'settings' && <PlatformSettings />}
    </div>
  );
};

export default AdminPanel;