import { services } from '../config/container.js';
import { logger } from '../utils/logger.js';

const SWEEP_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Runs the scheduled-report sweep on an interval (hourly cadence, unref'd so
 * it never keeps the process alive on its own). Failures are logged without
 * crashing the server.
 */
export const startReportScheduler = () => {
  const run = async () => {
    try {
      const results = await services.scheduledReports.runDue();
      const sent = results.filter((r) => r.sent > 0).length;
      if (results.length > 0) {
        logger.info(`Report sweep: ${results.length} due, ${sent} sent`);
      }
    } catch (err) {
      logger.error(`Report sweep failed: ${err.message}`);
    }
  };

  run();
  const interval = setInterval(run, SWEEP_INTERVAL_MS);
  interval.unref();
  return interval;
};

export default startReportScheduler;