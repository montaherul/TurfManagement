import { createPaginatedRepository } from './paginatedRepository.js';

/**
 * Generic CRUD repository factory. Eliminates the per-model boilerplate
 * (findById / findFirst / create / update / delete / count) repeated in
 * every repository.
 *
 * config: {
 *   select: { ... },                 // prisma select applied to all queries
 *   detailSelect: { ... },           // optional richer select (relations) for findById
 *   listConfig: { ... }              // when provided, exposes a paginated list()
 * }
 */
export const createBaseRepository = (prismaClient, model, config = {}) => {
  const { select, detailSelect, listConfig } = config;

  const baseArgs = select ? { select } : {};
  const detailArgs = detailSelect ? { select: detailSelect } : baseArgs;

  const repo = {
    findById: (id, options = {}) =>
      prismaClient[model].findFirst({ where: { id }, ...detailArgs, ...options }),

    findFirst: (where, options = {}) =>
      prismaClient[model].findFirst({ where, ...baseArgs, ...options }),

    findMany: (where, options = {}) =>
      prismaClient[model].findMany({ where, ...baseArgs, ...options }),

    findByIds: (ids, options = {}) =>
      prismaClient[model].findMany({ where: { id: { in: ids } }, ...baseArgs, ...options }),

    create: (data, options = {}) =>
      prismaClient[model].create({ data, ...baseArgs, ...options }),

    update: (id, data, options = {}) =>
      prismaClient[model].update({ where: { id }, data, ...baseArgs, ...options }),

    updateMany: (where, data) =>
      prismaClient[model].updateMany({ where, data }),

    delete: (id) =>
      prismaClient[model].delete({ where: { id } }),

    deleteMany: (where) =>
      prismaClient[model].deleteMany({ where }),

    count: (where = {}) =>
      prismaClient[model].count({ where }),

    exists: async (where) => (await prismaClient[model].count({ where })) > 0,
  };

  if (listConfig) {
    const paginated = createPaginatedRepository(prismaClient, model, listConfig);
    repo.list = paginated.list;
  }

  return repo;
};

export default createBaseRepository;