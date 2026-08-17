import { parsePagination, parseSort, buildPagination } from '../utils/pagination.js';

const isRangeKey = (key) => key.endsWith('__gte') || key.endsWith('__lte');

const coerceValue = (value, type) => {
  switch (type) {
    case 'boolean':
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    case 'int':
      return Number.isFinite(Number(value)) ? Number(value) : value;
    case 'float':
      return Number.isFinite(Number(value)) ? Number(value) : value;
    default:
      return value;
  }
};

/**
 * Generic paginated repository factory.
 *
 * config: {
 *   searchableFields: ['name', 'email', ...]           // scalar columns for ILIKE search
 *   filterMap: { param: 'column' | { field, type } }    // whitelisted equality filters
 *   sortableFields: ['createdAt', 'name', ...]          // whitelist for sort param
 *   defaultSort: [{ createdAt: 'desc' }]                // fallback orderBy
 *   include: { field: { select: {...} } }               // prisma include (optional)
 *   select: { ... }                                     // prisma select (optional)
 * }
 */
export const createPaginatedRepository = (prismaClient, model, config = {}) => {
  const {
    searchableFields = [],
    filterMap = {},
    sortableFields = null,
    defaultSort = [{ createdAt: 'desc' }],
    include,
    select,
  } = config;

  const buildWhere = ({ organizationId, filters = {}, search }) => {
    const where = {};
    if (organizationId) where.organizationId = organizationId;

    for (const [key, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      const baseKey = isRangeKey(key) ? key.slice(0, -5) : key;
      const mapped = filterMap[baseKey];
      if (!mapped) continue;

      const target = typeof mapped === 'string' ? { field: mapped, type: 'string' } : mapped;
      const value = coerceValue(rawValue, target.type || 'string');

      if (isRangeKey(key)) {
        const operator = key.endsWith('__gte') ? 'gte' : 'lte';
        if (target.path) {
          where[target.field] = where[target.field] || {};
          where[target.field].path = where[target.field].path || target.path;
          where[target.field][operator] = value;
        } else {
          where[target.field] = where[target.field] || {};
          where[target.field][operator] = value;
        }
      } else if (target.path) {
        where[target.field] = { path: target.path, equals: value };
      } else if (target.type === 'boolean') {
        where[target.field] = value;
      } else {
        where[target.field] = value;
      }
    }

    if (search) {
      const orClauses = searchableFields
        .map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }))
        .filter(Boolean);
      if (orClauses.length) {
        where.OR = where.OR ? [...where.OR, ...orClauses] : orClauses;
      }
    }

    return where;
  };

  const list = async ({ organizationId, page = 1, limit = 10, sort, filters = {}, search, extraWhere = {} }) => {
    const { page: pageNum, limit: limitNum } = parsePagination({ page, limit });
    const where = { ...buildWhere({ organizationId, filters, search }), ...extraWhere };
    const orderBy = parseSort(sort, sortableFields).length
      ? parseSort(sort, sortableFields)
      : defaultSort;

    const args = {
      where,
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      ...(include && { include }),
      ...(select && { select }),
    };

    const [data, total] = await prismaClient.$transaction([
      prismaClient[model].findMany(args),
      prismaClient[model].count({ where }),
    ]);

    return { data, pagination: buildPagination(data, total, pageNum, limitNum) };
  };

  const count = async ({ organizationId, where = {} }) => {
    return prismaClient[model].count({
      where: { ...(organizationId && { organizationId }), ...where },
    });
  };

  return { list, count, buildWhere };
};