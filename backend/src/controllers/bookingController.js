import { successResponse } from '../utils/asyncHandler.js';
import { dateOnly } from '../services/slotService.js';

export const createBookingController = ({ bookingService }) => {
  const create = async (req, res) => {
    const booking = await bookingService.create({
      facilityId: req.facilityId,
      customerId: req.user.userId,
      data: req.body,
      ipAddress: req.ip,
    });
    return successResponse(
      res,
      { booking },
      'Booking submitted. Awaiting payment verification.',
      201
    );
  };

  const get = async (req, res) => {
    const booking = await bookingService.get({
      facilityId: req.facilityId,
      id: req.params.id,
      customerId: req.user.role === 'booker' ? req.user.userId : null,
    });
    return successResponse(res, { booking }, 'Booking retrieved');
  };

  const listForFacility = async (req, res) => {
    const result = await bookingService.listForFacility({
      facilityId: req.facilityId,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
      resourceId: req.query.resourceId,
      date: req.query.date,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Bookings retrieved');
  };

  const listMine = async (req, res) => {
    const result = await bookingService.listForCustomer({
      customerId: req.user.userId,
      tab: req.query.tab,
      page: req.query.page,
      limit: req.query.limit,
    });
    return successResponse(res, result, 'Bookings retrieved');
  };

  const cancel = async (req, res) => {
    const booking = await bookingService.cancel({
      facilityId: req.facilityId,
      id: req.params.id,
      actorId: req.user.userId,
      actorRole: req.user.role,
      reason: req.body.reason,
      ipAddress: req.ip,
    });
    return successResponse(res, { booking }, 'Booking cancelled');
  };

  const checkIn = async (req, res) => {
    const booking = await bookingService.checkIn({
      facilityId: req.facilityId,
      id: req.params.id,
    });
    return successResponse(res, { booking }, 'Checked in');
  };

  const complete = async (req, res) => {
    const booking = await bookingService.complete({
      facilityId: req.facilityId,
      id: req.params.id,
    });
    return successResponse(res, { booking }, 'Booking completed');
  };

  const markNoShow = async (req, res) => {
    const booking = await bookingService.markNoShow({
      facilityId: req.facilityId,
      id: req.params.id,
    });
    return successResponse(res, { booking }, 'Booking marked as no-show');
  };

  const today = async (req, res) => {
    const date = req.query.date ? dateOnly(req.query.date) : dateOnly(new Date());
    const bookings = await bookingService.todayForFacility(req.facilityId, date);
    return successResponse(res, { bookings, date: date.toISOString().slice(0, 10) }, 'Today\'s bookings');
  };

  return { create, get, listForFacility, listMine, cancel, checkIn, complete, markNoShow, today };
};

export default createBookingController;