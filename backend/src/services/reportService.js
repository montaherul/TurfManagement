export const createReportService = ({ analyticsRepository }) => {
  const getAnalytics = async (organizationId) => {
    return analyticsRepository.dashboard(organizationId);
  };

  const getScoreTrends = async (organizationId, fieldId = null) => {
    const trends = await analyticsRepository.scoreTrends(organizationId, fieldId);
    return trends;
  };

  const getScoreDistribution = async (organizationId) => {
    const distribution = await analyticsRepository.scoreDistribution(organizationId);
    const tierCounts = distribution.reduce((acc, row) => {
      acc[row.tier] = (acc[row.tier] || 0) + row.count;
      return acc;
    }, {});
    return { distribution, tiers: tierCounts };
  };

  const getWorkOrderStatus = async (organizationId) => {
    return analyticsRepository.workOrderStatus(organizationId);
  };

  const getMaintenanceCosts = async (organizationId) => {
    return analyticsRepository.maintenanceCosts(organizationId);
  };

  const getCostByField = async (organizationId) => {
    return analyticsRepository.costByField(organizationId);
  };

  return { getAnalytics, getScoreTrends, getScoreDistribution, getWorkOrderStatus, getMaintenanceCosts, getCostByField };
};

export default createReportService;