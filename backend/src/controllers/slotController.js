import { successResponse } from '../utils/asyncHandler.js';

export const createSlotController = ({ slotService }) => {
  const listAvailability = async (req, res) => {
    const slots = await slotService.listAvailability({
      resourceId: req.query.resourceId,
      date: req.query.date,
    });
    return successResponse(res, { slots, count: slots.length }, 'Slots retrieved');
  };

  const generate = async (req, res) => {
    const result = await slotService.generateForDate({
      facilityId: req.facilityId,
      date: req.body.date,
      actorId: req.user.userId,
    });
    return successResponse(res, result, 'Slots generated');
  };

  const listForFacility = async (req, res) => {
    const slots = await slotService.listForFacility({
      facilityId: req.facilityId,
      date: req.query.date,
      resourceId: req.query.resourceId,
    });
    return successResponse(res, { slots, count: slots.length }, 'Slots retrieved');
  };

  const updateStatus = async (req, res) => {
    const slot = await slotService.updateStatus({
      facilityId: req.facilityId,
      id: req.params.id,
      status: req.body.status,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, { slot }, 'Slot updated');
  };

  return { listAvailability, generate, listForFacility, updateStatus };
};

export default createSlotController;