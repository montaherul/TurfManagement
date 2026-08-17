import api from '../utils/api';
import { createResourceService } from './createResourceService';

const usersResource = createResourceService('/permissions/users', {
  names: { list: 'getUsers', get: false, create: false, update: false, remove: false },
});

export const permissionService = {
  ...usersResource,

  getCatalog: async () => {
    const response = await api.get('/permissions/catalog');
    return response.data;
  },

  getMyPermissions: async () => {
    const response = await api.get('/permissions/my');
    return response.data;
  },

  getRolePermissions: async () => {
    const response = await api.get('/permissions/roles');
    return response.data;
  },

  updateRolePermissions: async (role, actions) => {
    const response = await api.put(`/permissions/roles/${role}`, { actions });
    return response.data;
  },

  getUserPermissions: async (userId) => {
    const response = await api.get(`/permissions/users/${userId}/permissions`);
    return response.data;
  },

  updateUserPermissions: async (userId, { allowed, denied }) => {
    const response = await api.put(`/permissions/users/${userId}/permissions`, { allowed, denied });
    return response.data;
  },

  updateUser: async (userId, data) => {
    const response = await api.put(`/permissions/users/${userId}`, data);
    return response.data;
  },

  removeUser: async (userId) => {
    const response = await api.delete(`/permissions/users/${userId}`);
    return response.data;
  },

  getPlatformRoles: async () => {
    const response = await api.get('/admin/permissions/roles');
    return response.data;
  },

  getOrganizations: async () => {
    const response = await api.get('/admin/organizations');
    return response.data;
  },

  updatePlatformRole: async (role, actions) => {
    const response = await api.put(`/admin/permissions/roles/${role}`, { actions });
    return response.data;
  },

  getOrganizationRoles: async (orgId) => {
    const response = await api.get(`/admin/permissions/organizations/${orgId}/roles`);
    return response.data;
  },

  updateOrganizationRole: async (orgId, role, actions) => {
    const response = await api.put(`/admin/permissions/organizations/${orgId}/roles/${role}`, { actions });
    return response.data;
  },

  getPlatformUserPermissions: async (userId) => {
    const response = await api.get(`/admin/permissions/users/${userId}`);
    return response.data;
  },

  updatePlatformUserPermissions: async (userId, { allowed, denied }) => {
    const response = await api.put(`/admin/permissions/users/${userId}`, { allowed, denied });
    return response.data;
  },

  updatePlatformUser: async (userId, data) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },
};

export default permissionService;