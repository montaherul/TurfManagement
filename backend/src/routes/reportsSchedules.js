import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { services } from '../config/container.js';
import { createScheduledReportController } from '../controllers/scheduledReportController.js';

const router = express.Router();
const scheduledReportController = createScheduledReportController({
  scheduledReportService: services.scheduledReports,
});

router.get('/', asyncHandler(scheduledReportController.list));
router.post('/', asyncHandler(scheduledReportController.upsert));
router.put('/:id', asyncHandler(scheduledReportController.upsert));
router.delete('/:id', asyncHandler(scheduledReportController.remove));

export default router;