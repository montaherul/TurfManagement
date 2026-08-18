import { prisma } from './db.js';
import { logger } from '../utils/logger.js';

// ---- Repositories (the only layer with data access) ----
import { userRepository, userListRepository } from '../repositories/userRepository.js';
import { facilityRepository, facilityListRepository } from '../repositories/facilityRepository.js';
import { resourceRepository, resourceListRepository } from '../repositories/resourceRepository.js';
import { slotRepository } from '../repositories/slotRepository.js';
import { bookingRepository, bookingListRepository } from '../repositories/bookingRepository.js';
import { paymentRepository, paymentListRepository } from '../repositories/paymentRepository.js';
import { blacklistRepository, blacklistListRepository } from '../repositories/blacklistRepository.js';
import { otpRepository } from '../repositories/otpRepository.js';
import { systemSettingRepository } from '../repositories/systemSettingRepository.js';
import { auditLogRepository, auditLogListRepository } from '../repositories/auditLogRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { rolePermissionRepository, userPermissionRepository } from '../repositories/permissionRepository.js';

// ---- Services (business logic) ----
import { createAuthService } from '../services/authService.js';
import { createFacilityService } from '../services/facilityService.js';
import { createResourceService } from '../services/resourceService.js';
import { createSlotService } from '../services/slotService.js';
import { createBookingService } from '../services/bookingService.js';
import { createPaymentService } from '../services/paymentService.js';
import { createBlacklistService } from '../services/blacklistService.js';
import { createAdminService } from '../services/adminService.js';
import { createNotificationService } from '../services/notificationService.js';
import { createPermissionService } from '../services/permissionService.js';

export const repositories = {
  users: userRepository,
  userList: userListRepository,
  facilities: facilityRepository,
  facilityList: facilityListRepository,
  resources: resourceRepository,
  resourceList: resourceListRepository,
  slots: slotRepository,
  bookings: bookingRepository,
  bookingList: bookingListRepository,
  payments: paymentRepository,
  paymentList: paymentListRepository,
  blacklists: blacklistRepository,
  blacklistList: blacklistListRepository,
  otps: otpRepository,
  systemSettings: systemSettingRepository,
  auditLogs: auditLogRepository,
  auditLogList: auditLogListRepository,
  notifications: notificationRepository,
  rolePermissions: rolePermissionRepository,
  userPermissions: userPermissionRepository,
};

const notificationService = createNotificationService({
  auditLogRepository,
  logger,
  userRepository,
  notificationRepository,
});

const permissionService = createPermissionService({
  rolePermissionRepository,
  userPermissionRepository,
  userRepository,
  userListRepository,
  auditLogRepository,
});

const facilityService = createFacilityService({
  facilityRepository,
  facilityListRepository,
  resourceRepository,
  userRepository,
  auditLogRepository,
  notificationService,
  logger,
});

const resourceService = createResourceService({
  resourceRepository,
  resourceListRepository,
  auditLogRepository,
});

const slotService = createSlotService({
  slotRepository,
  resourceRepository,
  auditLogRepository,
});

const paymentService = createPaymentService({
  paymentRepository,
  paymentListRepository,
  bookingRepository,
  notificationService,
  auditLogRepository,
});

const bookingService = createBookingService({
  bookingRepository,
  slotRepository,
  resourceRepository,
  facilityRepository,
  blacklistRepository,
  paymentRepository,
  notificationService,
  auditLogRepository,
});

const blacklistService = createBlacklistService({
  blacklistRepository,
  blacklistListRepository,
  userRepository,
  auditLogRepository,
});

export const services = {
  auth: createAuthService({
    userRepository,
    facilityRepository,
    auditLogRepository,
    notificationService,
  }),
  facilities: facilityService,
  resources: resourceService,
  slots: slotService,
  bookings: bookingService,
  payments: paymentService,
  blacklist: blacklistService,
  notification: notificationService,
  permissions: permissionService,
  admin: createAdminService({
    facilityService,
    userListRepository,
    systemSettingRepository,
    auditLogRepository,
  }),
};

export const container = { repositories, services, prisma };
export default container;