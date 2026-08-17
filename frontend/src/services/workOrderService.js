import api from '../utils/api';
import { createResourceService } from './createResourceService';

export const workOrderService = {
  ...createResourceService('/work-orders', {
    names: {
      list: 'getWorkOrders',
      get: 'getWorkOrder',
      create: 'createWorkOrder',
      update: 'updateWorkOrder',
      remove: 'deleteWorkOrder',
    },
  }),
};

export default workOrderService;