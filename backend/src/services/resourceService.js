import { AppError } from '../utils/ApiError.js';

export const RESOURCE_TYPES = [
  'FOOTBALL', 'BADMINTON', 'POOL', 'SNOOKER', 'CRICKET',
  'BASKETBALL', 'TENNIS', 'OTHER',
];

export const createResourceService = ({ resourceRepository, resourceListRepository, auditLogRepository }) => {
  const list = async ({ facilityId, page, limit, search, type, status, sort }) => {
    const result = await resourceListRepository.list({
      facilityId,
      page,
      limit,
      search,
      filters: { type, status },
      sort,
    });
    return result;
  };

  const listForFacility = (facilityId) => resourceRepository.findByFacility(facilityId);

  const get = async (facilityId, id) => {
    const resource = await resourceRepository.findFirst({ id, facilityId });
    if (!resource) {
      throw new AppError(404, 'Resource not found', { code: 'NOT_FOUND' });
    }
    return resource;
  };

  const create = async ({ facilityId, actorId, data }) => {
    const { name, type, capacity, basePrice, scheduleTemplate } = data;
    if (!RESOURCE_TYPES.includes(type)) {
      throw new AppError(422, `Invalid resource type: ${type}`, { code: 'VALIDATION_ERROR' });
    }
    const resource = await resourceRepository.create({
      facilityId,
      name,
      type,
      capacity: capacity ?? 1,
      basePrice: basePrice ?? 0,
      status: 'ACTIVE',
      scheduleTemplate: scheduleTemplate || null,
    });
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'resource.create',
      resource: 'resource',
      resourceId: resource.id,
      details: { name, type },
      ipAddress: data.ipAddress || null,
    });
    return resource;
  };

  const update = async ({ facilityId, id, actorId, data }) => {
    await get(facilityId, id);
    const allowed = ['name', 'type', 'capacity', 'basePrice', 'status', 'scheduleTemplate'];
    const payload = {};
    for (const key of allowed) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (payload.type && !RESOURCE_TYPES.includes(payload.type)) {
      throw new AppError(422, `Invalid resource type: ${payload.type}`, { code: 'VALIDATION_ERROR' });
    }
    if (payload.status && !['ACTIVE', 'INACTIVE', 'MAINTENANCE'].includes(payload.status)) {
      throw new AppError(422, `Invalid status: ${payload.status}`, { code: 'VALIDATION_ERROR' });
    }
    const resource = await resourceRepository.update(id, payload);
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'resource.update',
      resource: 'resource',
      resourceId: id,
      details: { fields: Object.keys(payload) },
      ipAddress: data.ipAddress || null,
    });
    return resource;
  };

  const remove = async ({ facilityId, id, actorId, ipAddress }) => {
    await get(facilityId, id);
    await resourceRepository.delete(id);
    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'resource.delete',
      resource: 'resource',
      resourceId: id,
      ipAddress: ipAddress || null,
    });
    return { id };
  };

  return { list, listForFacility, get, create, update, remove };
};

export default createResourceService;