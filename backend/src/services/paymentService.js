import { AppError } from '../utils/ApiError.js';

export const createPaymentService = ({
  paymentRepository,
  paymentListRepository,
  bookingRepository,
  notificationService,
  auditLogRepository,
}) => {
  const list = (params) =>
    paymentListRepository.list({
      facilityId: params.facilityId,
      page: params.page,
      limit: params.limit,
      search: params.search,
      sort: params.sort,
      filters: { status: params.status, bookingId: params.bookingId, method: params.method },
    });

  const pendingForFacility = (facilityId) =>
    paymentRepository.pendingByFacility(facilityId);

  const wallet = (facilityId) =>
    paymentRepository.walletSummary(facilityId);

  const verify = async ({ facilityId, id, verifierId, ipAddress }) => {
    const payment = await paymentRepository.findFirst({ id, facilityId });
    if (!payment) {
      throw new AppError(404, 'Payment not found', { code: 'NOT_FOUND' });
    }
    if (payment.status !== 'PENDING') {
      throw new AppError(422, `Payment is already ${payment.status.toLowerCase()}`, { code: 'INVALID_STATUS' });
    }

    const verified = await paymentRepository.update(id, {
      status: 'VERIFIED',
      verifiedBy: verifierId,
      verifiedAt: new Date(),
      platformFee: 15,
    });

    let booking = null;
    if (payment.bookingId) {
      booking = await bookingRepository.update(payment.bookingId, { status: 'CONFIRMED' });
      const detail = await bookingRepository.findById(booking.id);
      await notificationService.notifyUser(booking.customerId, 'booking:confirmed', {
        facilityId,
        bookingId: booking.id,
        bookingNo: booking.bookingNo,
        facilityName: detail?.facility?.name,
        resourceName: detail?.resource?.name,
        date: `${booking.date.toISOString().slice(0, 10)} ${booking.startTime}-${booking.endTime}`,
        totalAmount: booking.totalAmount,
      });
    }

    await auditLogRepository.create({
      facilityId,
      userId: verifierId,
      action: 'payment.verify',
      resource: 'payment',
      resourceId: id,
      details: { paymentNo: payment.paymentNo, amount: payment.amount },
      ipAddress: ipAddress || null,
    });

    return { payment: verified, booking };
  };

  const reject = async ({ facilityId, id, verifierId, reason, ipAddress }) => {
    const payment = await paymentRepository.findFirst({ id, facilityId });
    if (!payment) {
      throw new AppError(404, 'Payment not found', { code: 'NOT_FOUND' });
    }
    if (payment.status !== 'PENDING') {
      throw new AppError(422, `Payment is already ${payment.status.toLowerCase()}`, { code: 'INVALID_STATUS' });
    }

    const rejected = await paymentRepository.update(id, {
      status: 'REJECTED',
      verifiedBy: verifierId,
      verifiedAt: new Date(),
      note: reason || null,
    });

    let booking = null;
    if (payment.bookingId) {
      booking = await bookingRepository.update(payment.bookingId, {
        status: 'CANCELLED',
        cancelledBy: verifierId,
        cancelledAt: new Date(),
        cancelReason: reason || 'Payment rejected',
      });
      const items = await bookingRepository.bookingItemsByBookingId(booking.id);
      if (items.length) {
        await bookingRepository.deleteBookingItems(booking.id);
      }
      await notificationService.notifyUser(booking.customerId, 'payment:rejected', {
        facilityId,
        bookingId: booking.id,
        bookingNo: booking.bookingNo,
        reason: reason || 'Payment could not be verified',
      });
    }

    await auditLogRepository.create({
      facilityId,
      userId: verifierId,
      action: 'payment.reject',
      resource: 'payment',
      resourceId: id,
      details: { paymentNo: payment.paymentNo, reason },
      ipAddress: ipAddress || null,
    });

    return { payment: rejected, booking };
  };

  return { list, pendingForFacility, wallet, verify, reject };
};

export default createPaymentService;