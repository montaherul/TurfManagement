import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';
import { createPaginatedRepository } from './paginatedRepository.js';

const workOrderSelect = {
  id: true,
  organizationId: true,
  workOrderId: true,
  fieldId: true,
  inspectionId: true,
  title: true,
  description: true,
  tasks: true,
  priority: true,
  status: true,
  assignedTo: true,
  dueDate: true,
  completedDate: true,
  estimatedCost: true,
  actualCost: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const workOrderDetailSelect = {
  ...workOrderSelect,
  field: { select: { id: true, fieldId: true, name: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
};

export const workOrderListRepository = createPaginatedRepository(prisma, 'WorkOrder', {
  searchableFields: ['title', 'workOrderId', 'description'],
  filterMap: {
    status: 'status',
    priority: 'priority',
    fieldId: 'fieldId',
    inspectionId: 'inspectionId',
    assignedTo: { field: 'assignedTo', type: 'string' },
  },
  sortableFields: ['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'],
  select: workOrderSelect,
});

export const workOrderRepository = createBaseRepository(prisma, 'WorkOrder', {
  select: workOrderSelect,
  detailSelect: workOrderDetailSelect,
});

export default workOrderRepository;