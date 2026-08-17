import { services } from '../config/container.js';
import { logger } from '../utils/logger.js';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Runs the subscription billing sweep on an interval. The interval is
 * unref()'d so it never keeps the process alive on its own, and failures are
 * logged without crashing the server.
 */
export const startBillingScheduler = () => {
  const run = async () => {
    try {
      await services.subscriptions.runBillingCycle();
    } catch (err) {
      logger.error(`Billing sweep failed: ${err.message}`);
    }
  };

  run();
  const interval = setInterval(run, SWEEP_INTERVAL_MS);
  interval.unref();
  return interval;
};

export default startBillingScheduler;