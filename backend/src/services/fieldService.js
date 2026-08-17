import { AppError } from '../utils/ApiError.js';

const EARTH_RADIUS_KM = 6371;

export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export const createFieldService = ({
  fieldRepository,
  planLimitService,
  auditLogRepository,
  fieldListRepository,
}) => {
  const generateFieldCode = () =>
    `FLD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const list = (params) => fieldListRepository.list(params);

  const getById = async (id, _organizationId) => {
    const field = await fieldRepository.findById(id);
    if (!field) {
      throw new AppError(404, 'Field not found', { code: 'NOT_FOUND' });
    }
    return field;
  };

  const normalizeDimensions = (dimensions) => {
    if (!dimensions || typeof dimensions !== 'object') return dimensions;
    const lengthM = Number(dimensions.lengthM ?? dimensions.lengthMeters);
    const widthM = Number(dimensions.widthM ?? dimensions.widthMeters);
    if (!Number.isFinite(lengthM) || !Number.isFinite(widthM)) return dimensions;
    return { lengthM, widthM, areaSqm: Number(dimensions.areaSqm) || lengthM * widthM };
  };

  const normalizeAddress = (address) => {
    if (!address || typeof address !== 'string') return address;
    const [area, city, country] = address.split(',').map((part) => part.trim());
    return { area: area || null, city: city || null, country: country || null };
  };

  const create = async ({ organizationId, actorId, ipAddress, ...data }) => {
    await planLimitService.assertWithinLimits(organizationId, 'fields');

    const field = await fieldRepository.create({
      ...data,
      address: normalizeAddress(data.address),
      dimensions: normalizeDimensions(data.dimensions),
      organizationId,
      fieldId: data.fieldId || generateFieldCode(),
      status: data.status || 'active',
    });

    await auditLogRepository.create({
      organizationId,
      userId: actorId,
      action: 'field.create',
      resource: 'field',
      resourceId: field.id,
      details: { name: field.name, fieldId: field.fieldId },
      ipAddress: ipAddress || null,
    });

    return field;
  };

  const update = async (id, data, _organizationId) => {
    const field = await fieldRepository.findById(id);
    if (!field) {
      throw new AppError(404, 'Field not found', { code: 'NOT_FOUND' });
    }
    const updated = await fieldRepository.update(id, {
      ...data,
      address: normalizeAddress(data.address),
      dimensions: normalizeDimensions(data.dimensions),
    });
    return updated;
  };

  const remove = async (id, _organizationId) => {
    const field = await fieldRepository.findById(id);
    if (!field) {
      throw new AppError(404, 'Field not found', { code: 'NOT_FOUND' });
    }
    await fieldRepository.delete(id);
    return field;
  };

  /**
   * Nearby search: bounded raw-SQL query on gpsCoordinates JSONB, then
   * Haversine distance computed in JS and filtered by radius.
   */
  const findNearby = async ({ organizationId, lat, lng, radius }) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusKm = Number(radius) || 10;

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw new AppError(422, 'Valid lat and lng query parameters are required', { code: 'VALIDATION_ERROR' });
    }

    const kmPerDegLat = 110.574;
    const kmPerDegLng = 111.32 * Math.cos((latNum * Math.PI) / 180);
    const latDelta = radiusKm / kmPerDegLat;
    const lngDelta = radiusKm / kmPerDegLng;

    const candidates = await fieldRepository.findNearbyCandidates({
      organizationId,
      latMin: latNum - latDelta,
      latMax: latNum + latDelta,
      lngMin: lngNum - lngDelta,
      lngMax: lngNum + lngDelta,
    });

    const fields = candidates
      .map((f) => {
        const gps = f.gpsCoordinates;
        if (!gps || typeof gps.lat !== 'number' || typeof gps.lng !== 'number') return null;
        const distanceKm = haversineKm(latNum, lngNum, gps.lat, gps.lng);
        if (distanceKm > radiusKm) return null;
        return { ...f, distanceKm: Math.round(distanceKm * 100) / 100 };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return fields;
  };

  return { list, getById, create, update, remove, findNearby, generateFieldCode };
};

export default createFieldService;