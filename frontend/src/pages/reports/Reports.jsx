import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Map, ClipboardList, Wrench, Activity, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import DataTable from '../../components/datatable/DataTable';
import { ErrorState } from '../../components/ui';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  getAnalytics,
  getScoreTrends,
  getScoreDistribution,
  getWorkOrderStatus,
  getMaintenanceCosts,
  getCostByField,
} from '../../store/slices/analyticsSlice';
import {
  statusBadge,
  tierBadge,
  scoreFormatter,
  dateFormatter,
  fieldRefFormatter,
  userFormatter,
} from '../../components/datatable/columns';
import { titleCase } from '../../utils/format';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children, height = 300 }) => (
  <div className="bg-white rounded-2xl p-6 shadow-card">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
    <div style={{ height }}>{children}</div>
  </div>
);

const EmptyChart = () => (
  <div className="h-full flex items-center justify-center text-sm text-slate-400">No data available yet</div>
);

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    analytics,
    scoreTrends,
    scoreDistribution,
    workOrderStatus,
    maintenanceCosts,
    costByField,
    loading,
    error,
  } = useSelector((state) => state.analytics);

  const loadAll = () => {
    dispatch(getAnalytics());
    dispatch(getScoreTrends());
    dispatch(getScoreDistribution());
    dispatch(getWorkOrderStatus());
    dispatch(getMaintenanceCosts());
    dispatch(getCostByField());
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  if (error && !analytics) return <ErrorState message={error} onRetry={loadAll} />;
  if (loading && !analytics) return <LoadingSpinner text="Loading reports…" />;

  const stats = [
    { title: 'Total Fields', value: analytics?.totalFields ?? '—', icon: Map, color: 'bg-blue-500', sub: `${(analytics?.fieldsByStatus || []).length} status groups` },
    { title: 'Total Inspections', value: analytics?.totalInspections ?? '—', icon: ClipboardList, color: 'bg-green-500', sub: `${analytics?.inspectionsThisMonth ?? 0} this month` },
    { title: 'Avg Pitch Score', value: analytics?.avgScore != null ? Number(analytics.avgScore).toFixed(1) : '—', icon: Activity, color: 'bg-purple-500', sub: 'out of 100' },
    { title: 'Open Work Orders', value: analytics?.openWorkOrders ?? '—', icon: Wrench, color: 'bg-orange-500', sub: `${analytics?.completedWorkOrders ?? 0} completed` },
  ];

  const trendData = (scoreTrends || []).map((s) => ({ name: s.month, avgScore: Number(s.avgScore || 0) }));
  const woData = (workOrderStatus || []).map((s) => ({ name: titleCase(s.status), count: s.count }));
  const distData = (scoreDistribution || []).map((s) => ({ name: s.bucket, value: s.count }));
  const costData = (maintenanceCosts || []).map((s) => ({
    name: s.month,
    estimated: Number(s.estimated_total ?? s.estimated ?? 0),
    actual: Number(s.actual_total ?? s.actual ?? 0),
  }));
  const costByFieldData = (costByField || []).map((s) => ({
    name: s.fieldName,
    estimated: Number(s.estimated || 0),
    actual: Number(s.actual || 0),
  }));

  const inspectionColumns = [
    { title: 'Date', field: 'inspectionDate', width: 120, sorter: 'date', formatter: dateFormatter },
    { title: 'Field', field: 'fieldId', minWidth: 180, formatter: fieldRefFormatter },
    { title: 'Inspector', field: 'inspectorId', width: 150, formatter: userFormatter },
    { title: 'PQS', field: 'pitchQualityScore.total', width: 170, sorter: 'number', formatter: scoreFormatter },
    { title: 'Tier', field: 'pitchQualityScore.tier', width: 120, formatter: tierBadge },
    { title: 'Status', field: 'status', width: 130, formatter: statusBadge },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500 mt-1">Organizational performance across fields, inspections and maintenance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Score Trend">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Work Order Status">
          {woData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Score Distribution">
          {distData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData} cx="50%" cy="50%" labelLine={false} outerRadius={100} dataKey="value" nameKey="name">
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Maintenance Costs">
          {costData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="estimated" stroke="#f59e0b" fill="url(#costGradient)" strokeWidth={2} name="Estimated" />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Cost by Field">
          {costByFieldData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costByFieldData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={150} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="estimated" fill="#f59e0b" radius={[0, 8, 8, 0]} name="Estimated" />
                <Bar dataKey="actual" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              All Inspections
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Browse and export every inspection record</p>
          </div>
        </div>
        <DataTable
          url="/inspections"
          columns={inspectionColumns}
          searchable={{ placeholder: 'Search inspections…' }}
          exportFileName="all-inspections"
          initialSort={[{ field: 'inspectionDate', dir: 'desc' }]}
          rowClick={(row) => navigate(`/inspections/${row.id}`)}
          placeholder="No inspections to report yet."
        />
      </div>
    </div>
  );
};

export default Reports;