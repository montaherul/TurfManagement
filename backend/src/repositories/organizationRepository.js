import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

export const organizationListRepository = createPaginatedRepository(prisma, 'Organization', {
  searchableFields: ['name', 'slug'],
  filterMap: {},
  sortableFields: ['name', 'slug', 'createdAt', 'updatedAt'],
  select: {
    id: true,
    name: true,
    slug: true,
    logo: true,
    address: true,
    primaryContact: true,
    subscription: true,
    settings: true,
    createdAt: true,
    updatedAt: true,
  },
});

export const organizationRepository = {
  ...createBaseRepository(prisma, 'Organization'),

  findBySlug: (slug) =>
    prisma.organization.findFirst({ where: { slug } }),

  createSlug: (name) => {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 7);
    return `${base || 'org'}-${suffix}`;
  },
};

export default organizationRepository;