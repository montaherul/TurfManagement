import { successResponse } from '../utils/asyncHandler.js';

export const createScheduledReportController = ({ scheduledReportService }) => {
  const list = async (req, res) => {
    const schedules = await scheduledReportService.list(req.organizationId);
    return successResponse(res, { schedules });
  };

  const upsert = async (req, res) => {
    const { id, frequency, recipients, enabled } = req.body;
    const schedule = await scheduledReportService.upsert(req.organizationId, {
      id,
      frequency,
      recipients,
      enabled,
    });
    return successResponse(res, { schedule }, id ? 'Scheduled report updated' : 'Scheduled report created');
  };

  const remove = async (req, res) => {
    await scheduledReportService.remove(req.organizationId, req.params.id);
    return successResponse(res, { removed: true }, 'Scheduled report deleted');
  };

  return { list, upsert, remove };
};

export default createScheduledReportController;