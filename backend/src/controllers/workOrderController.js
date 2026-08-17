import { createCrudController } from './crudController.js';

export const createWorkOrderController = ({ workOrderService }) => {
  return createCrudController({
    service: workOrderService,
    resourceName: 'Work order',
    options: {
      payloadKey: 'workOrder',
      names: {
        list: 'getWorkOrders',
        get: 'getWorkOrder',
        create: 'createWorkOrder',
        update: 'updateWorkOrder',
        remove: 'deleteWorkOrder',
      },
      include: { list: true, get: true, create: true, update: true, remove: true },
      updateData: (req) => ({
        actorId: req.user.userId,
        ...req.body,
      }),
    },
  });
};

export default createWorkOrderController;