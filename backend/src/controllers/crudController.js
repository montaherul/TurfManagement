import { successResponse } from '../utils/asyncHandler.js';

const toKey = (name) => name.charAt(0).toLowerCase() + name.slice(1);

/**
 * Generic CRUD controller factory. Eliminates the repeated
 * list / getById / create / update / remove handlers shared by most
 * resource controllers.
 *
 * options: {
 *   names: { list: 'getFields', get: 'getField', create: 'createField', update: 'updateField', remove: 'deleteField' },
 *   payloadKey: 'field',                  // key used for the response payload
 *   serviceKey: 'id',                     // route param holding the record id
 *   listMessage: 'Fields retrieved successfully',
 *   createMessage: 'Field created',
 *   updateMessage: 'Field updated',
 *   deleteMessage: 'Field deleted',
 *   include: { list: true, get: true, create: true, update: true, remove: true },
 *   createData: (req) => ({ ...req.body, organizationId: req.organizationId, actorId: req.user.userId, ipAddress: req.ip }),
 *   updateData: (req) => req.body,        // service receives (id, data, organizationId)
 * }
 */
export const createCrudController = ({ service, resourceName, options = {} }) => {
  const {
    names = {},
    payloadKey = toKey(resourceName),
    serviceKey = 'id',
    listMessage = `${resourceName}s retrieved successfully`,
    createMessage = `${resourceName} created successfully`,
    updateMessage = `${resourceName} updated successfully`,
    deleteMessage = `${resourceName} deleted`,
    include = { list: true, get: true, create: true, update: true, remove: true },
    createData = (req) => ({
      ...req.body,
      organizationId: req.organizationId,
      actorId: req.user.userId,
      ipAddress: req.ip,
    }),
    updateData = (req) => req.body,
  } = options;

  const actions = {};

  if (include.list) {
    actions[names.list || 'list'] = async (req, res) => {
      const result = await service.list({
        organizationId: req.organizationId,
        page: req.query.page,
        limit: req.query.limit,
        sort: req.query.sort,
        search: req.query.search,
        filters: req.query,
      });
      return res.json({ success: true, message: listMessage, ...result });
    };
  }

  if (include.get) {
    actions[names.get || 'getById'] = async (req, res) => {
      const item = await service.getById(req.params[serviceKey]);
      return successResponse(res, { [payloadKey]: item });
    };
  }

  if (include.create) {
    actions[names.create || 'create'] = async (req, res) => {
      const item = await service.create(createData(req));
      return successResponse(res, { [payloadKey]: item }, createMessage, 201);
    };
  }

  if (include.update) {
    actions[names.update || 'update'] = async (req, res) => {
      const item = await service.update(
        req.params[serviceKey],
        updateData(req),
        req.organizationId
      );
      return successResponse(res, { [payloadKey]: item }, updateMessage);
    };
  }

  if (include.remove) {
    actions[names.remove || 'remove'] = async (req, res) => {
      await service.remove(req.params[serviceKey], req.organizationId);
      return successResponse(res, null, deleteMessage);
    };
  }

  return actions;
};

export default createCrudController;