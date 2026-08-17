import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

let client = null;
let connectionPromise = null;

export const connectRedis = async () => {
  if (client?.isReady) return client;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    const instance = createClient({
      url: env.redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => (retries > 3 ? new Error('Redis max retries exceeded') : Math.min(retries * 200, 2000)),
      },
    });
    instance.on('error', (err) => logger.warn(`Redis client error: ${err.message}`));
    try {
      await instance.connect();
      client = instance;
      logger.info('Redis connected');
    } catch (err) {
      logger.warn(`Redis unavailable (${err.message}) — continuing without cache`);
      client = null;
    }
    return client;
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
};

export const getRedis = () => client;

export const isRedisReady = () => Boolean(client?.isReady);

export const cacheGet = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`cacheGet failed for ${key}: ${err.message}`);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  if (!isRedisReady()) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    logger.warn(`cacheSet failed for ${key}: ${err.message}`);
  }
};

export const cacheDel = async (key) => {
  if (!isRedisReady()) return;
  try {
    await client.del(key);
  } catch (err) {
    logger.warn(`cacheDel failed for ${key}: ${err.message}`);
  }
};

export default client;
