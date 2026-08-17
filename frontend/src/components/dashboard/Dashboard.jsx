import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Map,
  ClipboardList,
  Wrench,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { getAnalytics, getScoreTrends, getWorkOrderStatus } from '../../store/slices/analyticsSlice';
import { getInspections } from '../../store/slices/inspectionSlice';
import { getWorkOrders } from '../../store/slices/workOrderSlice';
import { ErrorState, EmptyState } from '../ui';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatDate, titleCase, tierMeta } from '../../utils/format';

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children, height = 280 }) => (
  <div className="bg-white rounded-2xl p-6 shadow-card">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
    <div style={{ height }}>{children}</div>
  </div>
);

const emptyChart = (height = 280) => (
  <div className="flex items-center justify-center h-full text-sm text-slate-400">No data available yet</div>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { analytics, scoreTrends, workOrderStatus, loading, error } = useSelector((state) => state.analytics);
  const { inspections, loading: inspectionsLoading } = useSelector((state) => state.inspections);
  const { workOrders } = useSelector((state) => state.workOrders);
  const [loadError, setLoadError] = useState(null);

  const loadAll = () => {
    setLoadError(null);
    dispatch(getAnalytics()).catch((err) => setLoadError(err));
    dispatch(getScoreTrends());
    dispatch(getWorkOrderStatus());
    dispatch(getInspections({ page: 1, limit: 5 }));
    dispatch(getWorkOrders({ page: 1, limit: 5 }));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  if (error || loadError) {
    return <ErrorState message={error || 'Failed to load dashboard data'} onRetry={loadAll} />;
  }

  if (loading && !analytics) {
    return <LoadingSpinner text="Loading dashboard…" />;
  }

  const stats = [
    {
      title: 'Total Fields',
      value: analytics?.totalFields ?? '—',
      icon: Map,
      color: 'bg-blue-500',
      sub: `${(analytics?.fieldsByStatus || []).length} status groups tracked`,
    },
    {
      title: 'Inspections',
      value: analytics?.totalInspections ?? '—',
      icon: ClipboardList,
      color: 'bg-green-500',
      sub: `${analytics?.inspectionsThisMonth ?? 0} this month`,
    },
    {
      title: 'Open Work Orders',
      value: analytics?.openWorkOrders ?? '—',
      icon: Wrench,
      color: 'bg-orange-500',
      sub: `${analytics?.completedWorkOrders ?? 0} completed`,
    },
    {
      title: 'Avg Pitch Score',
      value: analytics?.avgScore != null ? Number(analytics.avgScore).toFixed(1) : '—',
      icon: Activity,
      color: 'bg-purple-500',
      sub: 'out of 100',
    },
  ];

  const trendData = (scoreTrends || []).map((s) => ({
    name: s.month,
    avgScore: Number(s.avgScore || 0),
  }));

  const woData = (workOrderStatus || []).map((s) => ({
    name: titleCase(s.status),
    count: s.count,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back, {user?.firstName}. Here's what's happening at your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pitch Quality Score Trend">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="avgScore" stroke="#3b82f6" fill="url(#scoreGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            emptyChart()
          )}
        </ChartCard>

        <ChartCard title="Work Order Status">
          {woData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            emptyChart()
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Inspections</h3>
            <Link to="/inspections" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {inspectionsLoading && !inspections.length ? (
            <LoadingSpinner size={28} text="" />
          ) : inspections.length ? (
            <div className="divide-y divide-slate-100">
              {inspections.map((inspection) => {
                const meta = tierMeta(inspection.pitchQualityScore?.tier);
                return (
                  <Link
                    key={inspection.id}
                    to={`/inspections/${inspection.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {inspection.field?.name || inspection.fieldId || 'Unknown field'}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(inspection.inspectionDate)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${meta.color}`}>{meta.label}</span>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">
                      {inspection.pitchQualityScore?.total ?? '—'}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No inspections yet" description="Create your first inspection to see it here." />
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Open Work Orders</h3>
            <Link to="/work-orders" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {workOrders.length ? (
            <div className="divide-y divide-slate-100">
              {workOrders.slice(0, 5).map((wo) => (
                <div key={wo.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{wo.title}</p>
                    <p className="text-xs text-slate-500">{wo.field?.name || 'Unknown field'}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                    {titleCase(wo.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No open work orders" description="Work orders will appear here when created." />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;