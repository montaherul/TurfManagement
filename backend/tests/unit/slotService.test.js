import { createSlotService, buildSlotsForResource, dateOnly, timeToMinutes } from '../../src/services/slotService.js';

const TEMPLATE = {
  startTime: '08:00',
  endTime: '23:00',
  stepMinutes: 60,
  days: [0, 1, 2, 3, 4, 5, 6],
  price: 1500,
  peakRanges: [{ start: '19:00', end: '23:00', price: 2200 }],
};

const resource = {
  id: 'res-1',
  facilityId: 'fac-1',
  name: 'Main 5v5 Turf',
  basePrice: 1500,
  status: 'ACTIVE',
  scheduleTemplate: TEMPLATE,
};

describe('slotService — buildSlotsForResource', () => {
  it('builds 15 hourly slots from 08:00 to 23:00', () => {
    const slots = buildSlotsForResource({ resource, date: new Date('2026-08-19T00:00:00.000Z') });
    expect(slots).toHaveLength(15);
    expect(slots[0]).toMatchObject({ startTime: '08:00', endTime: '09:00', price: 1500, status: 'AVAILABLE', isPeak: false });
  });

  it('applies peak pricing for evening slots', () => {
    const slots = buildSlotsForResource({ resource, date: new Date('2026-08-19T00:00:00.000Z') });
    const evening = slots.find((s) => s.startTime === '19:00');
    expect(evening.price).toBe(2200);
    expect(evening.isPeak).toBe(true);
  });

  it('returns no slots when the day is excluded by template days', () => {
    const closed = { ...TEMPLATE, days: [1, 2, 3, 4, 5] }; // excludes Sunday (0)
    const slots = buildSlotsForResource({ resource: { ...resource, scheduleTemplate: closed }, date: new Date('2026-08-16T00:00:00.000Z') });
    expect(slots).toHaveLength(0);
  });

  it('returns empty for a resource without a template', () => {
    const slots = buildSlotsForResource({ resource: { ...resource, scheduleTemplate: null }, date: new Date('2026-08-19T00:00:00.000Z') });
    expect(slots).toHaveLength(0);
  });
});

describe('slotService — date/time helpers', () => {
  it('dateOnly normalizes to UTC midnight', () => {
    const day = dateOnly('2026-08-19T23:59:59.000Z');
    expect(day.toISOString()).toBe('2026-08-19T00:00:00.000Z');
  });

  it('timeToMinutes parses HH:MM', () => {
    expect(timeToMinutes('19:30')).toBe(1170);
  });
});

describe('slotService — createSlotService', () => {
  const makeService = () => {
    const rows = [];
    const slotRepository = {
      createMany: async (data) => {
        rows.push(...data);
        return { count: data.length };
      },
      countByDate: async () => rows.filter((r) => r.date.getTime() === dateOnly(r.date).getTime()).length,
      findAvailableByResourceAndDate: async () => rows.filter((r) => r.status === 'AVAILABLE'),
      findMany: async (where) => rows,
      findFirst: async (where) => rows.find((r) => r.id === where.id) || null,
      update: async (id, data) => {
        const slot = rows.find((r) => r.id === id);
        Object.assign(slot, data);
        return slot;
      },
    };
    const audits = [];
    const auditLogRepository = { create: async (entry) => audits.push(entry) };
    const resources = [resource];
    const resourceRepository = {
      findMany: async () => resources,
      findById: async (id) => resources.find((r) => r.id === id) || null,
    };
    const service = createSlotService({ slotRepository, resourceRepository, auditLogRepository });
    return { service, slotRepository: rows, audits };
  };

  it('generateForDate creates slots and audits', async () => {
    const { service, slotRepository: rows, audits } = makeService();
    const result = await service.generateForDate({ facilityId: 'fac-1', date: '2026-08-19', actorId: 'u-1' });
    expect(result.generated).toBe(15);
    expect(rows).toHaveLength(15);
    expect(audits[0]).toMatchObject({ action: 'slot.generate', userId: 'u-1' });
  });

  it('updateStatus blocks changing a BOOKED slot', async () => {
    const { service, slotRepository: rows } = makeService();
    await service.generateForDate({ facilityId: 'fac-1', date: '2026-08-19' });
    rows[0].status = 'BOOKED';
    await expect(service.updateStatus({ facilityId: 'fac-1', id: rows[0].id, status: 'BLOCKED' })).rejects.toMatchObject({ statusCode: 422, code: 'SLOT_BOOKED' });
  });

  it('updateStatus rejects unknown statuses', async () => {
    const { service, slotRepository: rows } = makeService();
    await service.generateForDate({ facilityId: 'fac-1', date: '2026-08-19' });
    await expect(service.updateStatus({ facilityId: 'fac-1', id: rows[0].id, status: 'ON_FIRE' })).rejects.toMatchObject({ statusCode: 422 });
  });
});