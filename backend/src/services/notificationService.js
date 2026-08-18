import { emitToFacility, emitToUser } from './notifications/socketService.js';
import { sendEmail } from './notifications/emailService.js';

const EMAIL_SUBJECTS = {
  'booking:created': (payload) => `New booking ${payload.bookingNo || ''} awaiting verification`,
  'payment:submitted': (payload) => `Payment submitted — ${payload.bookingNo || 'booking'}`,
  'booking:confirmed': (payload) => `Booking confirmed — ${payload.bookingNo || ''}`,
  'booking:cancelled': (payload) => `Booking cancelled — ${payload.bookingNo || ''}`,
  'booking:completed': (payload) => `Booking completed — ${payload.bookingNo || ''}`,
  'payment:rejected': (payload) => `Payment rejected — ${payload.bookingNo || 'booking'}`,
  'facility:approved': (payload) => `Welcome to TurfBook — ${payload.facilityName || 'your facility'} is approved`,
};

const buildEmailText = (event, payload) => {
  switch (event) {
    case 'booking:created':
      return [
        `A new booking has been created and is awaiting payment verification.`,
        `Booking: ${payload.bookingNo}`,
        `Resource: ${payload.resourceName}`,
        `Date: ${payload.date} ${payload.startTime} - ${payload.endTime}`,
        `Amount: BDT ${payload.totalAmount}`,
        '',
        'Sign in to TurfBook to verify the payment.',
      ].join('\n');
    case 'payment:submitted':
      return [
        `A payment was submitted for booking ${payload.bookingNo || ''}.`,
        `Amount: BDT ${payload.amount ?? ''}`,
        `Method: ${payload.method || ''}`,
        `Transaction ID: ${payload.tranId || ''}`,
        '',
        'Sign in to TurfBook to verify it.',
      ].join('\n');
    case 'booking:confirmed':
      return [
        `Your booking ${payload.bookingNo} is confirmed.`,
        `Facility: ${payload.facilityName}`,
        `Resource: ${payload.resourceName}`,
        `Date: ${payload.date} ${payload.startTime} - ${payload.endTime}`,
        '',
        'See you on the field!',
      ].join('\n');
    case 'booking:cancelled':
      return [
        `Booking ${payload.bookingNo} was cancelled.`,
        `Reason: ${payload.reason || 'Not provided'}`,
      ].join('\n');
    case 'booking:completed':
      return [
        `Your booking ${payload.bookingNo} at ${payload.facilityName} is completed.`,
        'Thank you for booking with TurfBook!',
      ].join('\n');
    case 'payment:rejected':
      return [
        `The payment for booking ${payload.bookingNo || ''} was rejected.`,
        `Reason: ${payload.reason || 'Not provided'}`,
        'Contact the facility for assistance.',
      ].join('\n');
    case 'facility:approved':
      return [
        `Congratulations! Your facility ${payload.facilityName || ''} has been approved on TurfBook.`,
        'Sign in with the credentials you received to set up your facility profile, resources and pricing.',
      ].join('\n');
    default:
      return `TurfBook notification: ${event}`;
  }
};

const NOTIFICATION_TITLES = {
  'booking:created': (payload) => `New booking: ${payload.bookingNo || ''}`,
  'payment:submitted': (payload) => `Payment submitted (BDT ${payload.amount ?? '—'})`,
  'booking:confirmed': (payload) => `Booking confirmed: ${payload.bookingNo || ''}`,
  'booking:cancelled': (payload) => `Booking cancelled: ${payload.bookingNo || ''}`,
  'booking:completed': (payload) => `Booking completed: ${payload.bookingNo || ''}`,
  'booking:no_show': (payload) => `No show: ${payload.bookingNo || ''}`,
  'payment:rejected': (payload) => `Payment rejected: ${payload.bookingNo || ''}`,
  'facility:applied': (payload) => `New facility application: ${payload.facilityName || ''}`,
  'facility:approved': (payload) => `${payload.facilityName || 'Your facility'} is approved`,
};

const NOTIFICATION_MESSAGES = {
  'booking:created': (payload) =>
    `Booking ${payload.bookingNo || ''} (${payload.resourceName || ''}, ${payload.date || ''} ${payload.startTime || ''}-${payload.endTime || ''}) is awaiting payment verification.`,
  'payment:submitted': (payload) =>
    `Payment of BDT ${payload.amount ?? '—'} (${payload.method || ''}, tranId ${payload.tranId || '—'}) was submitted for verification.`,
  'booking:confirmed': (payload) =>
    `Your booking ${payload.bookingNo || ''} at ${payload.facilityName || 'the facility'} is confirmed for ${payload.date || ''} ${payload.startTime || ''}-${payload.endTime || ''}.`,
  'booking:cancelled': (payload) =>
    `Booking ${payload.bookingNo || ''} was cancelled. Reason: ${payload.reason || 'Not provided'}`,
  'booking:completed': (payload) =>
    `Your booking ${payload.bookingNo || ''} at ${payload.facilityName || 'the facility'} is completed.`,
  'booking:no_show': (payload) =>
    `Booking ${payload.bookingNo || ''} was marked as no-show.`,
  'payment:rejected': (payload) =>
    `The payment for booking ${payload.bookingNo || ''} was rejected. Reason: ${payload.reason || 'Not provided'}`,
  'facility:applied': (payload) =>
    `${payload.facilityName || 'A facility'} applied for onboarding (owner: ${payload.ownerName || '—'}).`,
  'facility:approved': (payload) =>
    `${payload.facilityName || 'Your facility'} was approved. Sign in to configure it.`,
};

const titleFor = (event, payload) => {
  const fn = NOTIFICATION_TITLES[event];
  return fn ? fn(payload || {}) : `TurfBook: ${event.replace(/[:._-]+/g, ' ')}`;
};

const messageFor = (event, payload) => {
  const fn = NOTIFICATION_MESSAGES[event];
  return fn ? fn(payload || {}) : null;
};

const STAFF_ROLES_FOR_EMAIL = ['facility_owner', 'manager'];

/**
 * Notification service — in-app notifications (persisted rows + socket emit)
 * and email notifications (SendGrid, console fallback when unconfigured).
 */
export const createNotificationService = ({ auditLogRepository, logger, userRepository, notificationRepository }) => {
  const emailFacilityStaff = async (facilityId, event, payload) => {
    if (!EMAIL_SUBJECTS[event]) return;
    try {
      const staff = await userRepository.findMany({
        facilityId,
        role: { in: STAFF_ROLES_FOR_EMAIL },
        isActive: true,
      });
      const subject = EMAIL_SUBJECTS[event](payload);
      const text = buildEmailText(event, payload);
      await Promise.all(
        staff
          .filter((s) => s.email)
          .map((s) => sendEmail({ to: s.email, subject, text }))
      );
    } catch (err) {
      logger.warn(`Failed to email facility staff: ${err.message}`);
    }
  };

  const emailUser = async (user, event, payload) => {
    if (!EMAIL_SUBJECTS[event] || !user?.email) return;
    try {
      await sendEmail({
        to: user.email,
        subject: EMAIL_SUBJECTS[event](payload),
        text: buildEmailText(event, payload),
      });
    } catch (err) {
      logger.warn(`Failed to email user: ${err.message}`);
    }
  };

  const persistForFacility = async (facilityId, event, payload) => {
    try {
      const staff = await userRepository.findMany({ facilityId, isActive: true });
      if (!staff.length) return;
      const rows = staff.map((user) => ({
        facilityId,
        userId: user.id,
        event,
        title: titleFor(event, payload),
        message: messageFor(event, payload),
        payload,
      }));
      const { count } = await notificationRepository.createMany(rows);
      if (count > 0) {
        emitToFacility(facilityId, 'notifications:new', { event });
      }
    } catch (err) {
      logger.warn(`Failed to persist facility notifications: ${err.message}`);
    }
  };

  const notifyFacility = async (
    facilityId,
    event,
    payload = {},
    { actorId = null, ipAddress = null, action = null } = {}
  ) => {
    try {
      await auditLogRepository.create({
        facilityId,
        userId: actorId,
        action: action || event,
        resource: 'notification',
        resourceId: payload.bookingId || payload.paymentId || null,
        details: { event, payload },
        ipAddress,
      });
    } catch (err) {
      logger.warn(`Failed to persist notification audit log: ${err.message}`);
    }

    await persistForFacility(facilityId, event, payload);

    emitToFacility(facilityId, event, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });

    emailFacilityStaff(facilityId, event, payload);

    return true;
  };

  const notifyUser = async (userId, event, payload = {}) => {
    try {
      await notificationRepository.createMany([
        {
          facilityId: payload.facilityId || null,
          userId,
          event,
          title: titleFor(event, payload),
          message: messageFor(event, payload),
          payload,
        },
      ]);
      const user = await userRepository.findById(userId);
      emailUser(user, event, payload);
    } catch (err) {
      logger.warn(`Failed to persist user notification: ${err.message}`);
    }
    emitToUser(userId, event, { ...payload, emittedAt: new Date().toISOString() });
    emitToUser(userId, 'notifications:new', { event });
    return true;
  };

  const notifyPlatform = async (event, payload = {}) => {
    try {
      const admins = await userRepository.findMany({ role: 'platform_admin', isActive: true });
      if (!admins.length) return true;
      const rows = admins.map((user) => ({
        facilityId: payload.facilityId || null,
        userId: user.id,
        event,
        title: titleFor(event, payload),
        message: messageFor(event, payload),
        payload,
      }));
      const { count } = await notificationRepository.createMany(rows);
      if (count > 0) {
        admins.forEach((user) => emitToUser(user.id, 'notifications:new', { event }));
      }
    } catch (err) {
      logger.warn(`Failed to notify platform admins: ${err.message}`);
    }
    return true;
  };

  const listForUser = async ({ userId, page, limit }) => {
    const result = await notificationRepository.listForUser({ userId, page, limit });
    const unread = await notificationRepository.unreadCount(userId);
    return { ...result, unread };
  };

  const unreadCount = (userId) => notificationRepository.unreadCount(userId);

  const markRead = async (id, userId) => {
    const result = await notificationRepository.markRead(id, userId);
    if (result.count === 0) return false;
    const unread = await notificationRepository.unreadCount(userId);
    emitToUser(userId, 'notifications:unread', { unread });
    return true;
  };

  const markAllRead = async (userId) => {
    await notificationRepository.markAllRead(userId);
    const unread = await notificationRepository.unreadCount(userId);
    emitToUser(userId, 'notifications:unread', { unread });
    return true;
  };

  const clearRead = async (userId) => {
    await notificationRepository.deleteRead(userId);
    return true;
  };

  return { notifyFacility, notifyUser, notifyPlatform, listForUser, unreadCount, markRead, markAllRead, clearRead };
};

export default createNotificationService;