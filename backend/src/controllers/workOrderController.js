import { createCrudController } from './crudController.js';

export const createWorkOrderController = ({ workOrderService }) => {
  const crud = createCrudController({
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

  const getCalendar = async (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const data = await workOrderService.getCalendar({
      organizationId: req.organizationId,
      month: Number(month),
      year: Number(year),
    });
    return res.json({ success: true, data });
  };

  return { ...crud, getCalendar };
};

export default createWorkOrderController;