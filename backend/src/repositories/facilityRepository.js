import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const facilitySelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  logo: true,
  coverPhoto: true,
  phone: true,
  email: true,
  address: true,
  facebookUrl: true,
  bkashNumber: true,
  nagadNumber: true,
  operatingHours: true,
  description: true,
  gallery: true,
  cancellationPolicy: true,
  application: true,
  createdAt: true,
  updatedAt: true,
};

export const facilityListRepository = createPaginatedRepository(prisma, 'Facility', {
  searchableFields: ['name', 'slug', 'phone', 'email'],
  filterMap: {
    status: 'status',
  },
  sortableFields: ['name', 'status', 'createdAt', 'updatedAt'],
  select: facilitySelect,
});

export const facilityRepository = {
  ...createBaseRepository(prisma, 'Facility', { select: facilitySelect }),

  findBySlug: (slug) =>
    prisma.facility.findFirst({ where: { slug }, select: facilitySelect }),

  createSlug: (name) => {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 7);
    return `${base || 'facility'}-${suffix}`;
  },
};

export default facilityRepository;