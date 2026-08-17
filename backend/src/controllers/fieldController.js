import { successResponse } from '../utils/asyncHandler.js';
import { createCrudController } from './crudController.js';

export const createFieldController = ({ fieldService }) => {
  const crud = createCrudController({
    service: fieldService,
    resourceName: 'Field',
    options: {
      payloadKey: 'field',
      names: {
        list: 'getFields',
        get: 'getField',
        create: 'createField',
        update: 'updateField',
        remove: 'deleteField',
      },
    },
  });

  const getNearbyFields = async (req, res) => {
    const fields = await fieldService.findNearby({
      organizationId: req.organizationId,
      lat: req.query.lat,
      lng: req.query.lng,
      radius: req.query.radius,
    });
    return successResponse(res, { fields, count: fields.length });
  };

  return { ...crud, getNearbyFields };
};

export default createFieldController;