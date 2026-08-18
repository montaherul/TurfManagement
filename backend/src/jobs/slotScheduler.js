import { createSlotService } from '../services/slotService.js';
import { slotRepository } from '../repositories/slotRepository.js';
import { resourceRepository } from '../repositories/resourceRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

let timer = null;
let running = false;

/**
 * Generates slots for tomorrow for every active resource at every facility.
 * Runs daily at the configured hour; idempotent (createMany skipDuplicates).
 */
export const runSlotScheduler = async () => {
  if (running) return;
  running = true;
  try {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slotService = createSlotService({ slotRepository, resourceRepository, auditLogRepository });
    const resources = await resourceRepository.findMany({ status: 'ACTIVE' });
    let generated = 0;
    for (const resource of resources) {
      const result = await slotService.generateForDate({
        facilityId: resource.facilityId,
        date,
        actorId: null,
      });
      generated += result.created;
    }
    logger.info(`[slotScheduler] Generated ${generated} slots for ${date.toISOString().slice(0, 10)} across ${resources.length} active resources`);
  } catch (error) {
    logger.error('[slotScheduler] Failed:', error.message);
  } finally {
    running = false;
  }
};

export const startSlotScheduler = () => {
  if (!env.schedulers.enabled) {
    logger.info('[slotScheduler] Disabled by configuration');
    return;
  }
  const hourMs = env.schedulers.slotHour * 60 * 60 * 1000;
  const delay = hourMs - (Date.now() % (24 * 60 * 60 * 1000));
  timer = setTimeout(() => {
    runSlotScheduler();
    timer = setInterval(runSlotScheduler, 24 * 60 * 60 * 1000);
  }, delay);
  logger.info(`[slotScheduler] Scheduled to run daily at ${env.schedulers.slotHour}:00`);
};

export const stopSlotScheduler = () => {
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
    timer = null;
  }
};

export default { runSlotScheduler, startSlotScheduler, stopSlotScheduler };