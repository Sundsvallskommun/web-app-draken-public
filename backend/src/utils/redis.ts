import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

export function getRedisClient(): RedisClientType | null {
  if (redisClient) return redisClient;

  const redisHost = process.env.REDIS_HOST;
  if (!redisHost) return null;

  const redisPassword = process.env.REDIS_PASSWORD;
  const redisPort = process.env.REDIS_PORT || '6379';

  redisClient = createClient({
    url: `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}`,
  });

  redisClient.on('error', err => logger.error(`Redis error: ${err.message}`));
  redisClient.on('connect', () => logger.info(`Connected to Redis (${redisHost}:${redisPort})`));

  redisClient.connect().catch(err => logger.error(`Redis connection failed: ${err.message}`));

  return redisClient;
}
