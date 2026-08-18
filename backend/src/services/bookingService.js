import { AppError } from '../utils/ApiError.js';
import { dateOnly } from './slotService.js';

export const createBookingService = ({
  bookingRepository,
  slotRepository,
  resourceRepository,
  facilityRepository,
  blacklistRepository,
  paymentRepository,
  notificationService,
  auditLogRepository,
}) => {
  const get = async ({ facilityId, id, customerId = null }) => {
    const where = { id };
    if (facilityId) where.facilityId = facilityId;
    if (customerId) where.customerId = customerId;
    const booking = await bookingRepository.findFirst(where, {});
    if (!booking) {
      throw new AppError(404, 'Booking not found', { code: 'NOT_FOUND' });
    }
    return booking;
  };

  const releaseSlots = async (bookingId) => {
    const items = await bookingRepository.bookingItemsByBookingId(bookingId);
    if (!items.length) return;
    await slotRepository.updateMany(
      { id: { in: items.map((i) => i.slotId) }, status: 'BOOKED' },
      { status: 'AVAILABLE' }
    );
    await bookingRepository.deleteBookingItems(bookingId);
  };

  /**
   * Customer booking flow: mobile OTP verified -> slots selected -> payment
   * proof (bKash/Nagad tranId) submitted -> Booking(PENDING) + Payment(PENDING).
   * The facility is derived from the selected resource (bookers carry no
   * facilityId in their JWT).
   */
  const create = async ({ facilityId, customerId, data, ipAddress }) => {
    const { resourceId, date, startTime, endTime, paymentMethod, transactionId, notes } = data;

    if (!paymentMethod || !transactionId) {
      throw new AppError(422, 'Payment method and transaction ID are required', { code: 'PAYMENT_PROOF_REQUIRED' });
    }
    if (!['BKASH', 'NAGAD', 'CASH'].includes(paymentMethod)) {
      throw new AppError(422, `Invalid payment method: ${paymentMethod}`, { code: 'VALIDATION_ERROR' });
    }

    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      throw new AppError(404, 'Resource not found', { code: 'NOT_FOUND' });
    }
    if (resource.status !== 'ACTIVE') {
      throw new AppError(422, 'Resource is not bookable', { code: 'RESOURCE_UNAVAILABLE' });
    }

    const targetFacilityId = facilityId || resource.facilityId;
    const facility = await facilityRepository.findById(targetFacilityId);
    if (!facility || !['APPROVED', 'ACTIVE'].includes(facility.status)) {
      throw new AppError(403, 'Facility is not accepting bookings', { code: 'FACILITY_NOT_OPERATIONAL' });
    }

    const blacklisted = await blacklistRepository.findForCustomer(targetFacilityId, customerId);
    if (blacklisted) {
      throw new AppError(403, 'You are blacklisted at this facility', { code: 'BLACKLISTED' });
    }

    const day = dateOnly(date);
    const slots = await slotRepository.findForResourceAndDate(resourceId, day);
    const wanted = slots.filter(
      (s) => s.startTime >= startTime && s.endTime <= endTime && s.status === 'AVAILABLE'
    );
    if (!wanted.length || wanted[0].startTime !== startTime || wanted[wanted.length - 1].endTime !== endTime) {
      throw new AppError(422, 'Selected slots are not available', { code: 'SLOTS_UNAVAILABLE' });
    }

    const totalAmount = wanted.reduce((sum, s) => sum + s.price, 0);
    const bookingNo = await bookingRepository.nextBookingNo();

    const booking = await bookingRepository.create({
      facilityId: targetFacilityId,
      bookingNo,
      customerId,
      resourceId,
      date: day,
      startTime: wanted[0].startTime,
      endTime: wanted[wanted.length - 1].endTime,
      totalAmount,
      paidAmount: totalAmount,
      dueAmount: 0,
      platformFee: 15,
      status: 'PENDING',
      paymentMethod,
      transactionId,
      otpVerifiedAt: new Date(),
      notes: notes || null,
    });

    await bookingRepository.createBookingItems(
      wanted.map((slot) => ({ bookingId: booking.id, slotId: slot.id }))
    );
    await slotRepository.updateMany(
      { id: { in: wanted.map((s) => s.id) } },
      { status: 'BOOKED' }
    );

    const paymentNo = await paymentRepository.nextPaymentNo();
    await paymentRepository.create({
      facilityId: targetFacilityId,
      bookingId: booking.id,
      paymentNo,
      customerId,
      amount: totalAmount,
      method: paymentMethod,
      tranId: transactionId,
      status: 'PENDING',
      platformFee: 15,
    });

    await auditLogRepository.create({
      facilityId: targetFacilityId,
      userId: customerId,
      action: 'booking.create',
      resource: 'booking',
      resourceId: booking.id,
      details: { bookingNo, totalAmount },
      ipAddress: ipAddress || null,
    });

    await notificationService.notifyFacility(targetFacilityId, 'booking:created', {
      targetFacilityId,
      bookingId: booking.id,
      bookingNo,
      resourceName: resource.name,
      date: day.toISOString().slice(0, 10),
      startTime: wanted[0].startTime,
      endTime: wanted[wanted.length - 1].endTime,
      totalAmount,
    }, { actorId: customerId });

    return bookingRepository.findById(booking.id);
  };

  const cancel = async ({ facilityId, id, actorId, actorRole, reason, ipAddress }) => {
    const booking = await get({ facilityId, id });
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new AppError(422, `Booking cannot be cancelled from status ${booking.status}`, { code: 'INVALID_STATUS' });
    }

    if (actorRole === 'booker' && booking.customerId !== actorId) {
      throw new AppError(403, 'You can only cancel your own bookings', { code: 'FORBIDDEN' });
    }

    const updated = await bookingRepository.update(id, {
      status: 'CANCELLED',
      cancelledBy: actorId,
      cancelledAt: new Date(),
      cancelReason: reason || null,
    });
    await releaseSlots(id);

    const payment = await paymentRepository.findFirst({ bookingId: id, status: 'VERIFIED' });
    if (payment) {
      await paymentRepository.update(payment.id, {
        status: 'REFUNDED',
        note: `Refunded on cancellation. Platform fee not refunded (BDT ${payment.platformFee}).`,
      });
    }

    await auditLogRepository.create({
      facilityId,
      userId: actorId,
      action: 'booking.cancel',
      resource: 'booking',
      resourceId: id,
      details: { reason },
      ipAddress: ipAddress || null,
    });

    await notificationService.notifyUser(booking.customerId, 'booking:cancelled', {
      facilityId,
      bookingId: id,
      bookingNo: booking.bookingNo,
      reason: reason || 'Cancelled by facility',
    });
    await notificationService.notifyFacility(facilityId, 'booking:cancelled', {
      facilityId,
      bookingId: id,
      bookingNo: booking.bookingNo,
      reason: reason || 'Cancelled by customer',
    }, { actorId });

    return updated;
  };

  const checkIn = async ({ facilityId, id, _actorId }) => {
    const booking = await get({ facilityId, id });
    if (booking.status !== 'CONFIRMED') {
      throw new AppError(422, 'Only confirmed bookings can be checked in', { code: 'INVALID_STATUS' });
    }
    return bookingRepository.update(id, { checkInAt: new Date() });
  };

  const complete = async ({ facilityId, id, _actorId }) => {
    const booking = await get({ facilityId, id });
    if (booking.status !== 'CONFIRMED') {
      throw new AppError(422, 'Only confirmed bookings can be completed', { code: 'INVALID_STATUS' });
    }
    const updated = await bookingRepository.update(id, {
      status: 'COMPLETED',
      checkOutAt: new Date(),
    });
    await notificationService.notifyUser(booking.customerId, 'booking:completed', {
      facilityId,
      bookingId: id,
      bookingNo: booking.bookingNo,
      facilityName: (await facilityRepository.findById(facilityId))?.name,
    });
    return updated;
  };

  const markNoShow = async ({ facilityId, id, _actorId }) => {
    const booking = await get({ facilityId, id });
    if (booking.status !== 'CONFIRMED') {
      throw new AppError(422, 'Only confirmed bookings can be marked no-show', { code: 'INVALID_STATUS' });
    }
    const updated = await bookingRepository.update(id, { status: 'NO_SHOW' });
    await notificationService.notifyUser(booking.customerId, 'booking:no_show', {
      facilityId,
      bookingId: id,
      bookingNo: booking.bookingNo,
    });
    return updated;
  };

  const listForFacility = (params) =>
    bookingRepository.list({
      facilityId: params.facilityId,
      page: params.page,
      limit: params.limit,
      search: params.search,
      sort: params.sort,
      filters: {
        status: params.status,
        resourceId: params.resourceId,
        date: params.date,
      },
    });

  const listForCustomer = ({ customerId, tab, page, limit }) =>
    bookingRepository.listForCustomer({ customerId, tab, page, limit });

  const todayForFacility = (facilityId, date) =>
    bookingRepository.todayByFacility(facilityId, dateOnly(date));

  return {
    get,
    create,
    cancel,
    checkIn,
    complete,
    markNoShow,
    listForFacility,
    listForCustomer,
    todayForFacility,
    releaseSlots,
  };
};

export default createBookingService;
