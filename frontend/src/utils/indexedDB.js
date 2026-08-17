const DB_NAME = 'turfcare-offline';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('inspections')) {
        db.createObjectStore('inspections', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
};

export const offlineDB = {
  async saveInspection(inspection) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readwrite');
      const store = tx.objectStore('inspections');
      const request = store.put(inspection);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getInspection(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readonly');
      const store = tx.objectStore('inspections');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllInspections() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readonly');
      const store = tx.objectStore('inspections');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteInspection(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('inspections', 'readwrite');
      const store = tx.objectStore('inspections');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async addToSyncQueue(action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.add({ ...action, status: 'pending', createdAt: new Date().toISOString() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getSyncQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async removeSyncQueueItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
