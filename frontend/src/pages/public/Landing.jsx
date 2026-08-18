import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Clock, DollarSign, Star, Gamepad2 } from 'lucide-react';
import { facilityService } from '../../services/facilityService';

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'TURF', label: 'Football turf' },
  { value: 'BADMINTON', label: 'Badminton' },
  { value: 'POOL', label: 'Pool' },
  { value: 'SNOOKER', label: 'Snooker' },
  { value: 'CRICKET', label: 'Cricket' },
  { value: 'BASKETBALL', label: 'Basketball' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'OTHER', label: 'Other' },
];

const Landing = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await facilityService.searchPublic({ search: query || undefined, type: type || undefined, page, limit: 12 });
      setFacilities(payload.data.data);
      setTotalPages(payload.data.pagination?.totalPages || 1);
    } catch {
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, type]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Book your game in seconds
          </h1>
          <p className="text-lg text-primary-50 mb-8 max-w-xl mx-auto">
            Turfs, badminton courts, pool tables and more — search, pick a slot and pay with bKash or Nagad.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search facilities by name…"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-white/30"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="sm:w-52 px-4 py-3.5 rounded-xl bg-white text-slate-900 outline-none focus:ring-4 focus:ring-white/30"
            >
              {TYPES.map((t) => (
                <option key={t.value || 'all'} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Popular venues</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No facilities found. Try a different search.</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((f) => (
                <Link
                  key={f.id}
                  to={`/facilities/${f.slug}`}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
                >
                  <div className="h-40 bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center">
                    <Gamepad2 className="w-12 h-12 text-primary-400" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
                        {f.name}
                      </h3>
                      <span className="shrink-0 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2 py-0.5">
                        {f.type}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {f.address?.street || f.address?.city || f.address?.division || 'Bangladesh'}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        From ৳{f.resources?.[0]?.basePrice || '—'} / hour
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Landing;