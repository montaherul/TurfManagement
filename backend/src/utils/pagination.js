const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT = 'createdAt:desc';

const normalizePage = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
};

const normalizeLimit = (value) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

/**
 * Parses "field:asc" | "field:desc" | "-field" | "field" | "a:asc,b:desc".
 * Whitelists fields via `allowed` (defaults to any non-empty string).
 * Returns an array of Prisma orderBy clauses, e.g. [{ name: 'asc' }].
 */
export const parseSort = (value, allowed = null) => {
  const raw = value && typeof value === 'string' ? value : DEFAULT_SORT;
  const clauses = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    let field = trimmed;
    let dir = 'desc';
    if (field.startsWith('-')) {
      field = field.slice(1);
    } else if (field.includes(':')) {
      const [f, d] = field.split(':');
      field = f;
      dir = (d || 'desc').toLowerCase();
    }
    if (!field) continue;
    if (allowed && !allowed.includes(field)) continue;
    clauses.push({ [field]: dir === 'asc' ? 'asc' : 'desc' });
  }
  return clauses.length ? clauses : [{ createdAt: 'desc' }];
};

export const parsePagination = (query = {}) => ({
  page: normalizePage(query.page),
  limit: normalizeLimit(query.limit),
  sort: query.sort || DEFAULT_SORT,
});

export const buildPagination = (data, total, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const buildPaginationResponse = (result, message = 'Success') => ({
  success: true,
  message,
  data: result.data,
  pagination: result.pagination,
});

export { MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_SORT };