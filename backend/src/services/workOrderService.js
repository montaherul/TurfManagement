import { AppError } from '../utils/ApiError.js';

const WORK_ORDER_STATUS_FLOW = {
  created: ['assigned'],
  assigned: ['in_progress'],
  in_progress: ['completed'],
  completed: ['verified'],
  verified: [],
  cancelled: [],
};

const LABOUR_RATE_BDT_PER_HOUR = 800;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Derives actionable maintenance tasks from an inspection's assessment data.
 * Each finding maps to a specific task with a category and an effort estimate.
 */
const deriveTasksFromInspection = (inspection) => {
  const surface = inspection?.surfaceAssessment || {};
  const soil = inspection?.soilAssessment || {};
  const structural = inspection?.structuralAssessment || {};
  const grassHealth = inspection?.grassHealth || {};
  const tasks = [];

  const addTask = (description, category, estimatedHours) =>
    tasks.push({ description, category, estimatedHours });

  if (toNumber(structural.drainageRateMinutes) > 10) {
    addTask('Clear drainage channels and aerate the rootzone to improve water percolation', 'drainage', 4);
  }
  if (toNumber(soil.compactionKgCm2) > 12) {
    addTask('Core aerate compacted areas to relieve soil compaction', 'aeration', 6);
  }
  if (toNumber(structural.thatchDepthMm) > 12) {
    addTask('Verticut or dethatch to remove excessive thatch buildup', 'thatching', 4);
  }
  if (toNumber(structural.surfaceEvennessMm) > 10) {
    addTask('Topdress and level uneven areas of the pitch', 'leveling', 5);
  }
  if (toNumber(surface.grassCoverPercent) < 70) {
    addTask('Overseed sparse areas to restore full grass cover', 'overseeding', 5);
  }
  if (surface.weedPresence === 'high' || surface.weedPresence === 'medium') {
    addTask('Apply targeted weed control treatment to affected areas', 'weed_control', 3);
  }
  if (
    surface.pestDamage === 'high' ||
    surface.pestDamage === 'medium' ||
    toNumber(grassHealth.pestRating) >= 4
  ) {
    addTask('Apply pest control treatment to affected areas', 'pest_control', 3);
  }
  if (
    surface.diseaseSigns === 'high' ||
    surface.diseaseSigns === 'medium' ||
    toNumber(grassHealth.diseaseRating) >= 4
  ) {
    addTask('Treat turf disease and restore affected areas', 'disease_treatment', 3);
  }
  if (toNumber(soil.moistureContent) < 20) {
    addTask('Adjust the irrigation schedule to relieve drought stress', 'irrigation', 2);
  } else if (toNumber(soil.moistureContent) > 80) {
    addTask('Adjust the irrigation schedule to prevent waterlogging', 'irrigation', 2);
  }

  return tasks;
};

export const createWorkOrderService = ({
  workOrderRepository,
  workOrderListRepository,
  fieldRepository,
  userRepository,
  notificationService,
  auditLogRepository,
}) => {
  const generateWorkOrderCode = () =>
    `WO-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const list = ({ organizationId, page, limit, sort, search, filters }) =>
    workOrderListRepository.list({ organizationId, page, limit, sort, search, filters });

  const getById = async (id) => {
    const workOrder = await workOrderRepository.findById(id);
    if (!workOrder) {
      throw new AppError(404, 'Work order not found', { code: 'NOT_FOUND' });
    }
    return workOrder;
  };

  const create = async ({ organizationId, actorId, ipAddress, ...data }) => {
    const field = await fieldRepository.findById(data.fieldId);
    if (!field) {
      throw new AppError(404, 'Field not found', { code: 'NOT_FOUND' });
    }

    const workOrder = await workOrderRepository.create({
      ...data,
      organizationId,
      workOrderId: data.workOrderId || generateWorkOrderCode(),
      status: 'created',
    });

    await auditLogRepository.create({
      organizationId,
      userId: actorId,
      action: 'workorder.create',
      resource: 'workOrder',
      resourceId: workOrder.id,
      details: { title: workOrder.title, workOrderId: workOrder.workOrderId },
      ipAddress: ipAddress || null,
    });

    await notificationService.notifyOrganization(
      organizationId,
      'work_order:created',
      {
        workOrderId: workOrder.id,
        code: workOrder.workOrderId,
        title: workOrder.title,
        priority: workOrder.priority,
        fieldId: workOrder.fieldId,
        status: workOrder.status,
      },
      { actorId, ipAddress, action: 'workorder.created' }
    );

    return workOrder;
  };

  const update = async (id, data, organizationId) => {
    const { actorId, ...rest } = data;
    const workOrder = await workOrderRepository.findById(id);
    if (!workOrder) {
      throw new AppError(404, 'Work order not found', { code: 'NOT_FOUND' });
    }

    const updateData = { ...rest };
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.workOrderId;

    if (rest.status && rest.status !== workOrder.status) {
      const allowed = WORK_ORDER_STATUS_FLOW[workOrder.status] || [];
      if (rest.status === 'cancelled' && workOrder.status !== 'completed' && workOrder.status !== 'verified') {
        updateData.status = 'cancelled';
      } else if (!allowed.includes(rest.status)) {
        throw new AppError(
          400,
          `Cannot transition work order from '${workOrder.status}' to '${rest.status}'`,
          {
            code: 'INVALID_STATUS_TRANSITION',
            data: { from: workOrder.status, to: rest.status, allowed },
          }
        );
      }
    }

    if (updateData.status === 'completed') {
      updateData.completedDate = new Date();
    }

    if (rest.assignedTo && rest.assignedTo !== workOrder.assignedTo) {
      const assignee = await userRepository.findById(rest.assignedTo);
      if (!assignee) {
        throw new AppError(404, 'Assignee not found', { code: 'NOT_FOUND' });
      }
    }

    const updated = await workOrderRepository.update(id, updateData);

    if (updated.status === 'verified') {
      await notificationService.notifyOrganization(
        organizationId,
        'work_order:verified',
        {
          workOrderId: updated.id,
          code: updated.workOrderId,
          title: updated.title,
        },
        { actorId, ipAddress: null, action: 'workorder.verified' }
      );
    }

    return updated;
  };

  const remove = async (id, organizationId) => {
    const workOrder = await workOrderRepository.findById(id);
    if (!workOrder) {
      throw new AppError(404, 'Work order not found', { code: 'NOT_FOUND' });
    }

    await workOrderRepository.delete(id);

    await auditLogRepository.create({
      organizationId,
      userId: null,
      action: 'workorder.delete',
      resource: 'workOrder',
      resourceId: id,
      details: { title: workOrder.title, workOrderId: workOrder.workOrderId },
      ipAddress: null,
    });

    return workOrder;
  };

  /**
   * Auto-generates a work order from an inspection when the PQS tier is
   * poor or acceptable. Returns null when no work order is warranted.
   */
  const createFromInspection = async ({ organizationId, actorId, inspection }) => {
    const score = inspection.pitchQualityScore;
    if (!score || (score.tier !== 'poor' && score.tier !== 'acceptable')) {
      return null;
    }

    const isPoor = score.tier === 'poor';

    const tasks = deriveTasksFromInspection(inspection);
    if (tasks.length === 0) {
      tasks.push({
        description: isPoor
          ? 'Address critical issues identified in inspection'
          : 'Schedule general maintenance identified in inspection',
        category: 'other',
        estimatedHours: isPoor ? 8 : 4,
      });
    }
    const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

    const workOrder = await workOrderRepository.create({
      organizationId,
      workOrderId: generateWorkOrderCode(),
      fieldId: inspection.fieldId,
      inspectionId: inspection.id,
      title: `Maintenance Required - ${isPoor ? 'Urgent' : 'Advisory'}`,
      description: `Field requires maintenance. PQS: ${score.total} (${score.tier}). Refer to inspection ${inspection.id}.`,
      priority: isPoor ? 'urgent' : 'high',
      status: 'created',
      dueDate: new Date(Date.now() + (isPoor ? 3 : 14) * 24 * 60 * 60 * 1000),
      tasks,
      estimatedCost: {
        amount: Math.max(isPoor ? 10000 : 5000, totalHours * LABOUR_RATE_BDT_PER_HOUR),
        currency: 'BDT',
      },
    });

    await notificationService.notifyOrganization(
      organizationId,
      'work_order:created',
      {
        workOrderId: workOrder.id,
        code: workOrder.workOrderId,
        title: workOrder.title,
        priority: workOrder.priority,
        fieldId: workOrder.fieldId,
        inspectionId: inspection.id,
        status: workOrder.status,
        autoGenerated: true,
      },
      { actorId, ipAddress: null, action: 'workorder.auto_created' }
    );

    return workOrder;
  };

  return { list, getById, create, update, remove, createFromInspection, generateWorkOrderCode };
};

export default createWorkOrderService;