import { parsePagination, parseSort, buildPagination, buildPaginationResponse, MAX_LIMIT } from '../../src/utils/pagination.js';
import { createPaginatedRepository } from '../../src/repositories/paginatedRepository.js';

describe('paginatedRepository — offset math', () => {
  const buildRepo = () => {
    const calls = [];
    const prismaMock = {
      $transaction: async (ops) => Promise.all(ops),
      Field: {
        findMany: async (args) => {
          calls.push(args);
          return [{ id: 'f1' }];
        },
        count: async () => 42,
      },
    };
    const repo = createPaginatedRepository(prismaMock, 'Field', {
      searchableFields: ['name'],
      filterMap: { status: 'status' },
      sortableFields: ['name', 'createdAt'],
    });
    return { repo, calls };
  };

  it('page 1 limit 10 -> skip 0, take 10', async () => {
    const { repo, calls } = buildRepo();
    const result = await repo.list({ organizationId: 'org-1', page: 1, limit: 10 });
    expect(calls[0].skip).toBe(0);
    expect(calls[0].take).toBe(10);
    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 42, totalPages: 5 });
  });

  it('page 3 limit 10 -> skip 20, take 10', async () => {
    const { repo, calls } = buildRepo();
    await repo.list({ organizationId: 'org-1', page: 3, limit: 10 });
    expect(calls[0].skip).toBe(20);
    expect(calls[0].take).toBe(10);
  });

  it('clamps limit to 100 (page 3 limit 500 -> skip 200, take 100)', async () => {
    const { repo, calls } = buildRepo();
    const result = await repo.list({ organizationId: 'org-1', page: 3, limit: 500 });
    expect(calls[0].skip).toBe(200);
    expect(calls[0].take).toBe(MAX_LIMIT);
    expect(result.pagination.limit).toBe(100);
  });

  it('clamps page to >= 1 (page 0 -> skip 0)', async () => {
    const { repo, calls } = buildRepo();
    await repo.list({ organizationId: 'org-1', page: 0, limit: 10 });
    expect(calls[0].skip).toBe(0);
  });

  it('scopes where by organizationId and passes filters', async () => {
    const { repo, calls } = buildRepo();
    await repo.list({ organizationId: 'org-1', filters: { status: 'active' }, search: 'mirpur' });
    expect(calls[0].where).toEqual({
      organizationId: 'org-1',
      status: 'active',
      OR: [{ name: { contains: 'mirpur', mode: 'insensitive' } }],
    });
  });

  it('defaults to createdAt:desc when no sort given', async () => {
    const { repo, calls } = buildRepo();
    await repo.list({ organizationId: 'org-1' });
    expect(calls[0].orderBy).toEqual([{ createdAt: 'desc' }]);
  });
});

describe('parsePagination', () => {
  it('uses defaults when params are missing', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, sort: 'createdAt:desc' });
  });

  it('clamps page to >= 1', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1);
    expect(parsePagination({ page: '-3' }).page).toBe(1);
  });

  it('clamps limit to the max of 100', () => {
    expect(parsePagination({ limit: '500' }).limit).toBe(MAX_LIMIT);
    expect(parsePagination({ limit: '0' }).limit).toBe(10);
  });
});

describe('parseSort', () => {
  it('parses field:dir syntax', () => {
    expect(parseSort('name:asc')).toEqual([{ name: 'asc' }]);
    expect(parseSort('createdAt:desc')).toEqual([{ createdAt: 'desc' }]);
  });

  it('parses -field shorthand as descending', () => {
    expect(parseSort('-inspectionDate')).toEqual([{ inspectionDate: 'desc' }]);
  });

  it('parses multiple comma-separated clauses', () => {
    expect(parseSort('status:asc,createdAt:desc')).toEqual([
      { status: 'asc' },
      { createdAt: 'desc' },
    ]);
  });

  it('defaults to createdAt:desc', () => {
    expect(parseSort(undefined)).toEqual([{ createdAt: 'desc' }]);
  });

  it('respects the whitelist', () => {
    expect(parseSort('hacked:asc', ['name'])).toEqual([{ createdAt: 'desc' }]);
    expect(parseSort('name:asc,role:desc', ['name'])).toEqual([{ name: 'asc' }]);
  });
});

describe('buildPagination / buildPaginationResponse — API envelope contract', () => {
  it('produces the exact envelope the frontend consumes', () => {
    const result = buildPaginationResponse(
      { data: [{ id: '1' }], pagination: buildPagination(1, 42, 1, 10) },
      'Fields retrieved successfully'
    );
    expect(result).toEqual({
      success: true,
      message: 'Fields retrieved successfully',
      data: [{ id: '1' }],
      pagination: { page: 1, limit: 10, total: 42, totalPages: 5, hasNext: true, hasPrev: false },
    });
  });

  it('computes hasNext/hasPrev correctly', () => {
    const p = buildPagination(10, 100, 5, 10);
    expect(p).toEqual({ page: 5, limit: 10, total: 100, totalPages: 10, hasNext: true, hasPrev: true });
  });

  it('has no next page on the last page', () => {
    expect(buildPagination(10, 100, 10, 10).hasNext).toBe(false);
    expect(buildPagination(10, 5, 1, 10).hasNext).toBe(false);
  });
});