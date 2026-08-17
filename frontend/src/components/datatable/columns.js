// Shared Tabulator column definitions & formatter factories for TurfCare BD.
// Each helper returns a Tabulator-compatible column definition or formatter.
import { formatBDT, formatDate, formatDateTime, tierMeta, titleCase } from '../../utils/format';

// --- Badge formatter factory -----------------------------------------------
// colorMap: { value: 'bg-x-100 text-x-700' } ; labelMap: optional { value: 'Label' }
// Returns a Tabulator formatter that renders a pill badge with the raw value.
export const badgeFormatter = (colorMap, labelMap) => (cell, formatterParams, onRendered) => {
  const value = cell.getValue();
  if (value === null || value === undefined || value === '') return '';
  const color = colorMap[value] || 'bg-slate-100 text-slate-600';
  const label = (labelMap && labelMap[value]) || titleCase(value);
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}">${label}</span>`;
};

// Standard color maps --------------------------------------------------------
export const STATUS_COLORS = {
  active: 'bg-success-100 text-success-700',
  inactive: 'bg-slate-100 text-slate-600',
  under_maintenance: 'bg-warning-100 text-warning-600',
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  verified: 'bg-success-100 text-success-700',
  created: 'bg-slate-100 text-slate-600',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-warning-100 text-warning-600',
  completed: 'bg-success-100 text-success-700',
  cancelled: 'bg-danger-100 text-danger-600',
};

export const TIER_COLORS = {
  excellent: 'bg-success-100 text-success-700',
  good: 'bg-blue-100 text-blue-700',
  acceptable: 'bg-warning-100 text-warning-600',
  poor: 'bg-danger-100 text-danger-600',
};

export const PRIORITY_COLORS = {
  urgent: 'bg-danger-100 text-danger-600',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-warning-100 text-warning-600',
  low: 'bg-blue-100 text-blue-700',
};

// --- Specific badge formatters ---------------------------------------------
export const statusBadge = badgeFormatter(STATUS_COLORS);
export const tierBadge = badgeFormatter(TIER_COLORS);
export const priorityBadge = badgeFormatter(PRIORITY_COLORS);

// --- Pitch Quality Score: progress bar + number ----------------------------
export const scoreFormatter = (cell) => {
  const total = Number(cell.getValue());
  if (Number.isNaN(total) || total === 0) return '<span class="text-slate-400">—</span>';
  const meta = tierMeta(
    total >= 85 ? 'excellent' : total >= 70 ? 'good' : total >= 55 ? 'acceptable' : 'poor'
  );
  const pct = Math.min(100, Math.max(0, total));
  return (
    `<div class="flex items-center gap-2 min-w-[110px]">` +
    `<div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">` +
    `<div class="h-full rounded-full ${meta.bar}" style="width:${pct}%"></div></div>` +
    `<span class="text-xs font-semibold tabular-nums ${meta.color.replace('bg-', 'text-').replace('-100', '-600')}">${total}</span>` +
    `</div>`
  );
};

// --- BDT money --------------------------------------------------------------
export const moneyFormatter = (cell) => {
  const value = cell.getValue();
  if (value === null || value === undefined || value === '') return '—';
  return `<span class="tabular-nums">${formatBDT(value)}</span>`;
};

// --- Dates ------------------------------------------------------------------
export const dateFormatter = (cell) => {
  const value = cell.getValue();
  if (!value) return '—';
  return `<span class="whitespace-nowrap">${formatDate(value)}</span>`;
};

export const datetimeFormatter = (cell) => {
  const value = cell.getValue();
  if (!value) return '—';
  return `<span class="whitespace-nowrap">${formatDateTime(value)}</span>`;
};

// --- Nested object helpers ---------------------------------------------------
// Renders { name, fieldId } as name + code, or a raw id as mono text
export const fieldRefFormatter = (cell) => {
  const value = cell.getValue();
  if (!value) return '—';
  if (typeof value === 'string') {
    return `<span class="font-mono text-xs text-slate-500">${value}</span>`;
  }
  const name = value.name || 'Unknown field';
  const code = value.fieldId;
  return code
    ? `<div class="leading-tight"><span class="block text-slate-700">${name}</span><span class="text-xs text-slate-400">${code}</span></div>`
    : `<span>${name}</span>`;
};

// Renders { firstName, lastName, email } as "First Last", or a raw id as mono text
export const userFormatter = (cell) => {
  const value = cell.getValue();
  if (!value) return '—';
  if (typeof value === 'string') {
    const short = value.length > 12 ? `${value.slice(0, 12)}…` : value;
    return `<span class="font-mono text-xs text-slate-500">${short}</span>`;
  }
  const name = [value.firstName, value.lastName].filter(Boolean).join(' ') || value.email || 'Unknown';
  return `<span class="whitespace-nowrap">${name}</span>`;
};

// --- Enum header filter helpers ---------------------------------------------
// Header filter params for a select dropdown with the given values
export const enumFilterParams = (values) => ({
  values: values.reduce((acc, v) => ({ ...acc, [v]: titleCase(v) }), {}),
  placeholder: 'All',
});

// --- Common column property shortcuts ---------------------------------------
// range column: two number inputs (min/max) mapped to field__gte / field__lte.
// The DataTable component assigns the custom range header-filter editor.
export const rangeColumn = (field, title, options = {}) => ({
  field,
  title,
  sorter: 'number',
  hozAlign: 'left',
  rangeFilter: true,
  ...options,
});