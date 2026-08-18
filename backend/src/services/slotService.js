import { AppError } from '../utils/ApiError.js';

/**
 * Slots are generated per resource per date from the resource's
 * scheduleTemplate: { startTime, endTime, stepMinutes, days[], peakRanges[] }
 * Each peakRange: { start, end, price } overrides the base price.
 */

export const dateOnly = (input) => {
  const date = input instanceof Date ? input : new Date(input);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const timeToMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + (m || 0);
};

export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const buildSlotsForResource = ({ resource, date }) => {
  const template = resource.scheduleTemplate;
  if (!template?.startTime || !template?.endTime) return [];

  if (Array.isArray(template.days) && template.days.length) {
    const dayOfWeek = date.getUTCDay();
    if (!template.days.includes(dayOfWeek)) return [];
  }

  const step = Math.max(15, Number(template.stepMinutes) || 60);
  const start = timeToMinutes(template.startTime);
  const end = timeToMinutes(template.endTime);
  const peaks = Array.isArray(template.peakRanges) ? template.peakRanges : [];

  const slots = [];
  for (let t = start; t + step <= end; t += step) {
    const startTime = minutesToTime(t);
    const endTime = minutesToTime(t + step);
    const peak = peaks.find(
      (p) => t >= timeToMinutes(p.start) && t < timeToMinutes(p.end)
    );
    slots.push({
      facilityId: resource.facilityId,
      resourceId: resource.id,
      date,
      startTime,
      endTime,
      price: peak ? Number(peak.price) || resource.basePrice : resource.basePrice,
      isPeak: Boolean(peak),
      status: 'AVAILABLE',
    });
  }
  return slots;
};

export const createSlotService = ({ slotRepository, resourceRepository, auditLogRepository }) => {
  /**
   * Generates slots for a date across all active resources with templates.
   * Idempotent — existing slots are skipped (unique resource+date+startTime).
   */
  const generateForDate = async ({ facilityId, date, actorId }) => {
    const day = dateOnly(date);
    const resources = await resourceRepository.findMany({
      facilityId,
      status: { in: ['ACTIVE', 'MAINTENANCE'] },
    });
    const rows = [];
    for (const resource of resources) {
      rows.push(...buildSlotsForResource({ resource, date: day }));
    }
    let created = 0;
    if (rows.length) {
      const result = await slotRepository.createMany(rows);
      created = result.count;
    }
    await auditLogRepository.create({
      facilityId,
      userId: actorId || null,
      action: 'slot.generate',
      resource: 'slot',
      details: { date: day.toISOString(), created },
      ipAddress: null,
    });
    return { date: day, generated: created, existing: rows.length - created };
  };

  const listAvailability = async ({ resourceId, date }) => {
    const day = dateOnly(date);
    const resource = await resourceRepository.findById(resourceId);
    if (!resource || resource.status !== 'ACTIVE') {
      throw new AppError(404, 'Resource not found', { code: 'NOT_FOUND' });
    }
    if (resource.scheduleTemplate) {
      const existing = await slotRepository.countByDate(day);
      if (existing === 0) {
        await generateForDate({ facilityId: resource.facilityId, date: day });
      }
    }
    return slotRepository.findAvailableByResourceAndDate(resourceId, day);
  };

  const listForFacility = async ({ facilityId, date, resourceId }) => {
    const day = dateOnly(date);
    const where = { facilityId, date: day };
    if (resourceId) where.resourceId = resourceId;
    return slotRepository.findMany(where, { orderBy: [{ resourceId: 'asc' }, { startTime: 'asc' }] });
  };

  const updateStatus = async ({ facilityId, id, status, actorId, ipAddress }) => {
    if (!['AVAILABLE', 'BLOCKED', 'MAINTENANCE'].includes(status)) {
      throw new AppError(422, `Invalid slot status: ${status}`, { code: 'VALIDATION_ERROR' });
    }
    const slot = await slotRepository.findFirst({ id, facilityId });
    if (!slot) {
      throw new AppError(404, 'Slot not found', { code: 'NOT_FOUND' });
    }
    if (slot.status === 'BOOKED') {
      throw new AppError(422, 'Cannot change a booked slot', { code: 'SLOT_BOOKED' });
    }
    const updated = await slotRepository.update(id, { status });
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'slot.update',
      resource: 'slot',
      resourceId: id,
      details: { status },
      ipAddress: ipAddress || null,
    });
    return updated;
  };

  return { generateForDate, listAvailability, listForFacility, updateStatus };
};

export default createSlotService;