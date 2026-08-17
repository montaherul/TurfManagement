import { successResponse } from '../utils/asyncHandler.js';

export const createReportController = ({ reportService }) => {
  const getAnalytics = async (req, res) => {
    const dashboard = await reportService.getAnalytics(req.organizationId);
    return successResponse(res, { dashboard });
  };

  const getScoreTrends = async (req, res) => {
    const trends = await reportService.getScoreTrends(
      req.organizationId,
      req.query.fieldId || null
    );
    return successResponse(res, { trends });
  };

  const getScoreDistribution = async (req, res) => {
    const result = await reportService.getScoreDistribution(req.organizationId);
    return successResponse(res, result);
  };

  const getWorkOrderStatus = async (req, res) => {
    const counts = await reportService.getWorkOrderStatus(req.organizationId);
    return successResponse(res, { counts });
  };

  const getMaintenanceCosts = async (req, res) => {
    const costs = await reportService.getMaintenanceCosts(req.organizationId);
    return successResponse(res, { costs });
  };

  const getCostByField = async (req, res) => {
    const costs = await reportService.getCostByField(req.organizationId);
    return successResponse(res, { costs });
  };

  return { getAnalytics, getScoreTrends, getScoreDistribution, getWorkOrderStatus, getMaintenanceCosts, getCostByField };
};

export default createReportController;