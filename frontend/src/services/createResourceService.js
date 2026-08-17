import api from '../utils/api';

/**
 * Generic REST resource service factory. Eliminates the repeated
 * getList / getById / create / update / delete boilerplate in every
 * frontend service module.
 *
 * resource: base path, e.g. '/fields'
 * options: {
 *   names: { list: 'getFields', get: 'getField', create: 'createField', update: 'updateField', remove: 'deleteField' }
 *   noId: true,            // resource endpoints without :id (e.g. /subscriptions)
 * }
 */
export const createResourceService = (resource, options = {}) => {
  const {
    names = {},
    noId = false,
  } = options;

  const basePath = resource.startsWith('/') ? resource : `/${resource}`;
  const withId = (id) => `${basePath}/${id}`;

  const service = {};

  if (names.list !== false) {
    service[names.list || 'list'] = async (params = {}) => {
      const response = await api.get(basePath, { params });
      return response.data;
    };
  }

  if (names.get !== false && !noId) {
    service[names.get || 'get'] = async (id) => {
      const response = await api.get(withId(id));
      return response.data;
    };
  }

  if (names.create !== false) {
    service[names.create || 'create'] = async (data) => {
      const response = await api.post(basePath, data);
      return response.data;
    };
  }

  if (names.update !== false) {
    service[names.update || 'update'] = async (id, data) => {
      const response = await api.put(noId ? basePath : withId(id), data);
      return response.data;
    };
  }

  if (names.remove !== false && !noId) {
    service[names.remove || 'remove'] = async (id) => {
      const response = await api.delete(withId(id));
      return response.data;
    };
  }

  return service;
};

export default createResourceService;