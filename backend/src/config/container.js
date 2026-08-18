import { prisma } from './db.js';
import { logger } from '../utils/logger.js';

// ---- Repositories (the only layer with data access) ----
import { fieldRepository, fieldListRepository } from '../repositories/fieldRepository.js';
import { inspectionRepository } from '../repositories/inspectionRepository.js';
import { workOrderRepository, workOrderListRepository } from '../repositories/workOrderRepository.js';
import { userRepository, userListRepository } from '../repositories/userRepository.js';
import { organizationRepository, organizationListRepository } from '../repositories/organizationRepository.js';
import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { paymentRepository } from '../repositories/paymentRepository.js';
import { auditLogRepository, auditLogListRepository } from '../repositories/auditLogRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { scheduledReportRepository } from '../repositories/scheduledReportRepository.js';
import { analyticsRepository } from '../repositories/analyticsRepository.js';
import { rolePermissionRepository, userPermissionRepository } from '../repositories/permissionRepository.js';

// ---- Services (business logic) ----
import { createAuthService } from '../services/authService.js';
import { createFieldService } from '../services/fieldService.js';
import { createInspectionService } from '../services/inspectionService.js';
import { createWorkOrderService } from '../services/workOrderService.js';
import { createSubscriptionService } from '../services/subscriptionService.js';
import { createReportService } from '../services/reportService.js';
import { createPlanLimitService } from '../services/planLimitService.js';
import { createNotificationService } from '../services/notificationService.js';
import { createScheduledReportService } from '../services/scheduledReportService.js';
import { createAdminService } from '../services/adminService.js';
import { createPermissionService } from '../services/permissionService.js';
import { createPaymentService } from '../services/paymentService.js';

export const repositories = {
  fields: fieldRepository,
  fieldList: fieldListRepository,
  inspections: inspectionRepository,
  workOrders: workOrderRepository,
  workOrderList: workOrderListRepository,
  users: userRepository,
  userList: userListRepository,
  organizations: organizationRepository,
  organizationList: organizationListRepository,
  subscriptions: subscriptionRepository,
  payments: paymentRepository,
  auditLogs: auditLogRepository,
  auditLogList: auditLogListRepository,
  notifications: notificationRepository,
  scheduledReports: scheduledReportRepository,
  analytics: analyticsRepository,
  rolePermissions: rolePermissionRepository,
  userPermissions: userPermissionRepository,
};

const notificationService = createNotificationService({
  auditLogRepository,
  logger,
  userRepository,
  notificationRepository,
});
const planLimitService = createPlanLimitService({
  subscriptionRepository,
  fieldRepository,
  inspectionRepository,
  userRepository,
});
const workOrderService = createWorkOrderService({
  workOrderRepository,
  workOrderListRepository,
  fieldRepository,
  userRepository,
  notificationService,
  auditLogRepository,
});
const paymentService = createPaymentService({
  paymentRepository,
  organizationRepository,
  auditLogRepository,
  notificationService,
  logger,
});

export const services = {
  planLimit: planLimitService,
  notification: notificationService,
  auth: createAuthService({
    userRepository,
    organizationRepository,
    subscriptionRepository,
    auditLogRepository,
  }),
  fields: createFieldService({
    fieldRepository,
    fieldListRepository,
    planLimitService,
    notificationService,
    auditLogRepository,
  }),
  workOrders: workOrderService,
  inspections: createInspectionService({
    inspectionRepository,
    fieldRepository,
    workOrderService,
    notificationService,
    auditLogRepository,
    planLimitService,
    organizationRepository,
  }),
  subscriptions: createSubscriptionService({
    subscriptionRepository,
    organizationRepository,
    auditLogRepository,
    notificationService,
    paymentService,
    logger,
  }),
  reports: createReportService({ analyticsRepository }),
  scheduledReports: createScheduledReportService({
    scheduledReportRepository,
    organizationRepository,
    reportService: createReportService({ analyticsRepository }),
    logger,
  }),
  admin: createAdminService({
    userRepository,
    userListRepository,
    fieldListRepository,
    organizationRepository,
    organizationListRepository,
    auditLogRepository,
    auditLogListRepository,
    planLimitService,
  }),
  permissions: createPermissionService({
    rolePermissionRepository,
    userPermissionRepository,
    userRepository,
    userListRepository,
    auditLogRepository,
  }),
  payments: paymentService,
};

export const container = { repositories, services, prisma };
export default container;