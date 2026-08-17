import { format, parseISO, isValid } from 'date-fns';

export const formatBDT = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return '৳0';
  return `৳${num.toLocaleString('en-BD')}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '—';
  return format(date, 'dd/MM/yyyy');
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '—';
  return format(date, 'dd/MM/yyyy HH:mm');
};

export const titleCase = (value) => {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const tierMeta = (tier) => {
  switch (tier) {
    case 'excellent':
      return { label: 'Excellent', color: 'bg-success-100 text-success-700', bar: 'bg-success-500' };
    case 'good':
      return { label: 'Good', color: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' };
    case 'acceptable':
      return { label: 'Acceptable', color: 'bg-warning-100 text-warning-600', bar: 'bg-warning-500' };
    case 'poor':
      return { label: 'Poor', color: 'bg-danger-100 text-danger-600', bar: 'bg-danger-500' };
    default:
      return { label: 'N/A', color: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' };
  }
};

export const scoreColor = (score) => {
  if (score >= 85) return 'text-success-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 55) return 'text-warning-600';
  return 'text-danger-600';
};

export const getInitials = (firstName, lastName) =>
  `${(firstName || '?')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();

export const fullName = (user) =>
  user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown';