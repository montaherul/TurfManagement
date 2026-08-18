import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Building2, CheckCircle2 } from 'lucide-react';
import { applyForFacility, clearError } from '../../store/slices/authSlice';

const FACILITY_TYPES = [
  'TURF',
  'BADMINTON',
  'POOL',
  'SNOOKER',
  'CRICKET',
  'BASKETBALL',
  'TENNIS',
  'OTHER',
];

const Apply = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    facilityName: '',
    facilityType: 'TURF',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    phone: '',
    address: { street: '', city: '', division: 'Dhaka' },
    description: '',
  });

  useEffect(() => {
    if (error) toast.error(error);
    dispatch(clearError());
  }, [error, dispatch]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updateAddress = (field, value) =>
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(applyForFacility(form));
    if (result.meta.requestStatus === 'fulfilled') {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application submitted</h1>
          <p className="text-sm text-slate-500 mb-6">
            Our team will review your application and email you the credentials once it is approved.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Back to TurfBook
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">List your facility</h1>
            <p className="text-sm text-slate-500">Get bookings from thousands of players across Bangladesh</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Facility name *</label>
              <input
                required
                placeholder="e.g. Dhanmondi Football Turf"
                value={form.facilityName}
                onChange={(e) => update('facilityName', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Facility type *</label>
              <select
                value={form.facilityType}
                onChange={(e) => update('facilityType', e.target.value)}
                className={inputClass}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Contact phone *</label>
              <input
                required
                pattern="01[3-9][0-9]{8}"
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Owner information</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Full name *</label>
                <input
                  required
                  value={form.ownerName}
                  onChange={(e) => update('ownerName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  required
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => update('ownerEmail', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mobile *</label>
                <input
                  required
                  pattern="01[3-9][0-9]{8}"
                  placeholder="01XXXXXXXXX"
                  value={form.ownerPhone}
                  onChange={(e) => update('ownerPhone', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Location</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Street / area</label>
                <input
                  value={form.address.street}
                  onChange={(e) => updateAddress('street', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  value={form.address.city}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Division</label>
                <select
                  value={form.address.division}
                  onChange={(e) => updateAddress('division', e.target.value)}
                  className={inputClass}
                >
                  {['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Tell players about your facility â€” surface, floodlights, changing roomsâ€¦"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Submittingâ€¦' : 'Submit application'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">
            â† Back to TurfBook
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Apply;