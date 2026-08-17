import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { services } from '../config/container.js';
import { createReportController } from '../controllers/reportController.js';

const router = express.Router();
const reportController = createReportController({ reportService: services.reports });

router.get('/analytics', asyncHandler(reportController.getAnalytics));
router.get('/score-trends', asyncHandler(reportController.getScoreTrends));
router.get('/score-distribution', asyncHandler(reportController.getScoreDistribution));
router.get('/workorder-status', asyncHandler(reportController.getWorkOrderStatus));
router.get('/maintenance-costs', asyncHandler(reportController.getMaintenanceCosts));
router.get('/cost-by-field', asyncHandler(reportController.getCostByField));

export default router;