/**
 * DataTable — reusable server-side data grid for TurfCare BD.
 *
 * Built on Tabulator 6.x with remote pagination / sorting / filtering wired to
 * the REST API contract:
 *   page, limit, sort=field:asc|desc, search, field=value, field__gte/__lte
 *
 * Props:
 *   url             (string, required)  API path relative to /api (e.g. "/fields")
 *   columns         (array,  required)  Tabulator column definitions. Supports
 *                     custom props: `rangeFilter` (min/max → field__gte/__lte),
 *                     `filterTarget: "search"` (filter value → `search` param)
 *   initialSort     (array)             [{field, dir}]
 *   pageSize        (number)            default 10
 *   pageSizeSelector(array)             default [10,25,50,100]
 *   searchable      (bool|object)       global search box ({placeholder})
 *   exportable      (array|false)       ['csv','xlsx','pdf'] (default) or false
 *   exportFileName  (string)
 *   ajaxParams      (object)            static params merged into every request
 *   actions         (array)             [{label, icon, color, show, onClick(row, table)}]
 *                     icons: 'eye'|'pencil'|'trash'|'download'|'check'|'x'
 *   rowClick        (fn)                (rowData, rowComponent) => void
 *   onDataLoaded    (fn)                (rows) => void
 *   height          (number|string)     table body height (default 520)
 *   placeholder     (string)
 *   className       (string)
 *   getTable        (fn)                receives the Tabulator instance
 *
 * Ref API: refresh(), setFilter(field, type, value), clearFilter(), getTable()
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator_site.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import api from '../../utils/api';
import { icons } from './icons';

applyPlugin(jsPDF);

const debounce = (fn, wait = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// Custom header-filter editor for numeric range columns (min / max pair).
// The two values are joined into "min,max" and parsed in the request mapper.
const rangeFilterEditor = (cell, onRendered, success) => {
  const holder = document.createElement('div');
  holder.className = 'dt-range-filter';
  const makeInput = (placeholder) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = placeholder;
    input.className = 'dt-filter-input';
    input.addEventListener('change', () => {
      success(`${holder.querySelector('.dt-range-min').value},${holder.querySelector('.dt-range-max').value}`);
    });
    return input;
  };
  const min = makeInput('Min');
  min.classList.add('dt-range-min');
  const max = makeInput('Max');
  max.classList.add('dt-range-max');
  holder.appendChild(min);
  holder.appendChild(max);
  onRendered(() => min.focus());
  return holder;
};

const DataTable = forwardRef(function DataTable(
  {
    url,
    columns,
    initialSort = [{ field: 'createdAt', dir: 'desc' }],
    pageSize = 10,
    pageSizeSelector = [10, 25, 50, 100],
    searchable = false,
    exportable = ['csv', 'xlsx', 'pdf'],
    exportFileName = 'export',
    ajaxParams = {},
    actions = [],
    rowClick,
    onDataLoaded,
    height = 520,
    placeholder = 'No records found',
    className = '',
    getTable,
  },
  ref
) {
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const actionsRef = useRef(actions);
  const rowClickRef = useRef(rowClick);
  const onDataLoadedRef = useRef(onDataLoaded);
  const staticParamsRef = useRef(ajaxParams);
  const columnMapRef = useRef({});

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    rowClickRef.current = rowClick;
  }, [rowClick]);

  useEffect(() => {
    onDataLoadedRef.current = onDataLoaded;
  }, [onDataLoaded]);

  useEffect(() => {
    staticParamsRef.current = ajaxParams;
  }, [ajaxParams]);

  // Build the table once; rebuild when url / columns change.
  useEffect(() => {
    if (!containerRef.current) return undefined;

    // Map Tabulator request params → backend contract
    const buildParams = (params) => {
      const out = {};
      out.page = params.page || 1;
      out.limit = params.size || pageSize;

      if (Array.isArray(params.sort) && params.sort.length) {
        out.sort = params.sort.map((s) => `${s.field}:${s.dir}`).join(',');
      }

      if (Array.isArray(params.filter)) {
        params.filter.forEach((f) => {
          if (f.value === '' || f.value === undefined || f.value === null) return;
          const col = columnMapRef.current[f.field];
          if (col && typeof col.headerFilterMap === 'function') {
            Object.assign(out, col.headerFilterMap(f.value));
          } else if (col && col.rangeFilter) {
            const baseField = col.filterField || col.field;
            const [min, max] = String(f.value).split(',');
            if (min !== '' && min !== undefined) out[`${baseField}__gte`] = min;
            if (max !== '' && max !== undefined) out[`${baseField}__lte`] = max;
          } else if (col && col.filterTarget === 'search') {
            out.search = f.value;
          } else {
            out[f.field] = f.value;
          }
        });
      }

      // global search box (passed via setData params)
      if (params.search) out.search = params.search;
      if (params.search === '') delete out.search;

      Object.assign(out, staticParamsRef.current);
      return out;
    };

    // Resolve nested fields for formatters: Tabulator gives value of the leaf.
    const preparedColumns = columns.map((col) => {
      columnMapRef.current[col.field] = col;
      if (col.rangeFilter && !col.headerFilter) {
        col.headerFilter = rangeFilterEditor;
        col.headerFilterLiveFilterDelay = 300;
      }
      return { ...col };
    });

    const buildActionsColumn = () => {
      if (!actionsRef.current.length) return null;
      return {
        title: 'Actions',
        field: '_actions',
        width: actionsRef.current.length * 44 + 12,
        minWidth: 110,
        hozAlign: 'center',
        headerSort: false,
        resizable: false,
        frozen: true,
        download: false,
        formatter: (cell) => {
          const actions = actionsRef.current;
          const html = actions
            .map((a, i) => {
              const visible = typeof a.show === 'function' ? a.show(cell.getData()) : a.show !== false;
              if (!visible) return '';
              const color = a.color || 'text-slate-500 hover:text-primary-600 hover:bg-primary-50';
              return `<button type="button" class="dt-action ${color} p-1.5 rounded-lg transition-colors" data-action="${i}" title="${a.label || ''}">${icons[a.icon || 'eye']}</button>`;
            })
            .join('');
          return `<div class="flex items-center justify-center gap-0.5">${html}</div>`;
        },
      };
    };

    const allColumns = [...preparedColumns, buildActionsColumn()].filter(Boolean);

    const table = new Tabulator(containerRef.current, {
      // remote data + pagination
      ajaxURL: url,
      ajaxParams: { _t: Date.now() },
      ajaxRequestFunc: (requestUrl, config, params) =>
        api.get(requestUrl, { params: buildParams(params) }).then((res) => res.data),
      ajaxResponse: (requestUrl, params, response) => ({
        data: response?.data || [],
        last_page: response?.pagination?.totalPages || 1,
        last_row: response?.pagination?.total || 0,
      }),
      pagination: true,
      paginationMode: 'remote',
      paginationSize: pageSize,
      paginationSizeSelector: pageSizeSelector,
      paginationCounter: 'rows',
      paginationButtonCount: 5,
      paginationInitialPage: 1,
      sortMode: 'remote',
      filterMode: 'remote',
      initialSort,
      // layout
      layout: 'fitColumns',
      responsiveLayout: 'hide',
      movableColumns: true,
      height,
      placeholder,
      columnDefaults: {
        tooltip: true,
        headerSort: true,
        headerFilterPlaceholder: 'Filter…',
      },
      columns: allColumns,
      dependencies: { XLSX, jspdf: jsPDF },
      rowClick: (e, row) => {
        if (e.target.closest('.dt-action')) return;
        if (rowClickRef.current) rowClickRef.current(row.getData(), row);
      },
      dataLoaded: (rows) => {
        if (onDataLoadedRef.current) onDataLoadedRef.current(rows);
      },
    });

    // Delegated click handling for the actions column
    const handleActionClick = (e) => {
      const btn = e.target.closest('.dt-action');
      if (!btn) return;
      const actionIndex = Number(btn.dataset.action);
      const action = actionsRef.current[actionIndex];
      if (!action) return;
      const row = table.getRow(btn.closest('.tabulator-row')?.dataset?.id || btn.dataset.rowId);
      const data = row ? row.getData() : {};
      if (action.onClick) action.onClick(data, row);
    };
    containerRef.current.addEventListener('click', handleActionClick);

    tableRef.current = table;
    if (getTable) getTable(table);

    return () => {
      containerRef.current?.removeEventListener('click', handleActionClick);
      table.destroy();
      tableRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, columns]);

  // Global search box (debounced) → re-requests with `search` param
  const handleSearch = (value) => {
    if (!tableRef.current) return;
    tableRef.current.setData(url, { search: value || undefined }).then(() => {
      if (tableRef.current) tableRef.current.setPage(1);
    });
  };
  const debouncedSearch = useRef(debounce(handleSearch));

  // Export toolbar
  const handleExport = (type) => {
    if (!tableRef.current) return;
    const base = exportFileName || 'export';
    if (type === 'csv') {
      tableRef.current.download('csv', `${base}.csv`, { bom: true });
    } else if (type === 'xlsx') {
      tableRef.current.download('xlsx', `${base}.xlsx`, { sheetName: base });
    } else if (type === 'pdf') {
      tableRef.current.download('pdf', `${base}.pdf`, {
        orientation: 'landscape',
        title: base,
        autoTable: { margin: { top: 40 } },
      });
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: () => {
      if (tableRef.current) return tableRef.current.setData();
      return Promise.resolve();
    },
    setFilter: (field, type, value) => tableRef.current?.setFilter(field, type, value),
    clearFilter: () => tableRef.current?.clearFilter(),
    getTable: () => tableRef.current,
  }));

  const exportButtons = [
    { type: 'csv', label: 'CSV', icon: icons.fileCsv, cls: 'hover:text-emerald-600 hover:bg-emerald-50' },
    { type: 'xlsx', label: 'XLSX', icon: icons.fileSpreadsheet, cls: 'hover:text-green-600 hover:bg-green-50' },
    { type: 'pdf', label: 'PDF', icon: icons.filePdf, cls: 'hover:text-red-600 hover:bg-red-50' },
  ].filter((b) => exportable === false || (Array.isArray(exportable) && exportable.includes(b.type)));

  return (
    <div className={`bg-white rounded-2xl shadow-card overflow-hidden ${className}`}>
      {(searchable || exportButtons.length) && (
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-200">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                dangerouslySetInnerHTML={{ __html: icons.search }}
              />
              <input
                type="text"
                placeholder={typeof searchable === 'object' ? searchable.placeholder : 'Search…'}
                onChange={(e) => debouncedSearch.current(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {exportButtons.map((b) => (
              <button
                key={b.type}
                type="button"
                onClick={() => handleExport(b.type)}
                title={`Export ${b.label}`}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 rounded-lg transition-colors ${b.cls}`}
                dangerouslySetInnerHTML={{ __html: `${b.icon}<span>${b.label}</span>` }}
              />
            ))}
          </div>
        </div>
      )}
      <div ref={containerRef} className="tabulator-theme-override" />
    </div>
  );
});

export default DataTable;