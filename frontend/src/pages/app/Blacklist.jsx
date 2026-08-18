import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Search, UserX } from 'lucide-react';
import { blacklistService } from '../../services/blacklistService';
import Modal from '../../components/ui/Modal';

const CATEGORIES = ['NO_SHOW', 'DAMAGE', 'MISCONDUCT', 'OTHER'];

const Blacklist = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customer, setCustomer] = useState(null);
  const [category, setCategory] = useState('NO_SHOW');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await blacklistService.list({ search: search || undefined, limit: 50 });
      setEntries(payload.data.data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const findCustomer = async () => {
    try {
      const payload = await blacklistService.findCustomer(customerQuery);
      setCustomer(payload.data.customer);
      if (!payload.data.customer) toast.info('No customer found with that mobile number');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Search failed');
    }
  };

  const handleAdd = async () => {
    if (!customer) {
      toast.error('Find a customer first');
      return;
    }
    setSaving(true);
    try {
      await blacklistService.add({ mobile: customer.mobile, category, reason });
      toast.success('Customer blacklisted');
      setModalOpen(false);
      setCustomer(null);
      setReason('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to blacklist');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    setRemoving(id);
    try {
      await blacklistService.remove(id);
      toast.success('Removed from blacklist');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Blacklist</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mobile…"
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500 w-56"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : entries.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No blacklisted customers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Added on</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{e.customer?.firstName || e.customerName || '—'} {e.customer?.lastName || ''}</p>
                      <p className="text-xs text-slate-400">{e.customer?.mobile || e.mobile}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium border border-red-200 rounded-full px-2.5 py-1 bg-red-50 text-red-600">{e.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{e.reason || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(e.createdAt).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleRemove(e.id)}
                        disabled={removing === e.id}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Remove from blacklist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Blacklist a customer">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Find by mobile number</label>
            <div className="flex gap-2">
              <input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
              />
              <button
                onClick={findCustomer}
                className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                Search
              </button>
            </div>
          </div>

          {customer && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{customer.firstName} {customer.lastName}</p>
                <p className="text-xs text-slate-500">{customer.mobile}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this customer being blacklisted?"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Adding…' : 'Blacklist customer'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Blacklist;