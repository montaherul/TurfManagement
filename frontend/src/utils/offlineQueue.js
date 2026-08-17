import { inspectionService } from '../services/inspectionService';
import { offlineDB } from '../utils/indexedDB';

export const offlineQueue = {
  async enqueue(action) {
    await offlineDB.addToSyncQueue(action);
  },

  async processQueue() {
    const queue = await offlineDB.getSyncQueue();
    const pending = queue.filter((item) => item.status === 'pending');

    for (const item of pending) {
      try {
        if (item.type === 'CREATE_INSPECTION') {
          await inspectionService.createInspection(item.payload);
        }
        await offlineDB.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error('[offlineQueue] Failed to sync item:', item.id, error);
      }
    }
  },
};
