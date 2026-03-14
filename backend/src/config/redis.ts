import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Redis client with automatic reconnection and error logging.
 * Used for caching analytics queries and session management.
 */
const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => logger.info('🔴 Redis connected'));
redis.on('error', (err) => logger.error('Redis connection error:', err));

/**
 * Cache utility wrapper around Redis with JSON serialization.
 */
export const cache = {
  /** Get a cached value, automatically parsed from JSON */
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  },

  /** Set a cached value with TTL in seconds */
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  /** Delete a cached key */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /** Delete all keys matching a pattern */
  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /** Check if a key exists */
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },
};

export default redis;
