import { createClient, RedisClientType } from 'redis';

import { logger } from './logger';

let redisClient: RedisClientType | null = null;
let redisConnecting: Promise<RedisClientType | null> | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient?.isReady) return redisClient;
  if (redisConnecting) return redisConnecting;

  const redisHost = process.env.REDIS_HOST;
  if (!redisHost) return null;

  redisConnecting = (async () => {
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisPort = process.env.REDIS_PORT || '6379';

    const client = createClient({
      url: `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}`,
    }) as RedisClientType;

    client.on('error', err => logger.error(`Redis error: ${err.message}`));
    client.on('connect', () => logger.info(`Connected to Redis (${redisHost}:${redisPort})`));

    try {
      await client.connect();
      redisClient = client;
      return client;
    } catch (err) {
      logger.error(`Redis connection failed: ${(err as Error).message}`);
      return null;
    } finally {
      redisConnecting = null;
    }
  })();

  return redisConnecting;
}
