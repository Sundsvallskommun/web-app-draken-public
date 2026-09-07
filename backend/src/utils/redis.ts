import { createClient, RedisClientType } from 'redis';

import { logApplicationEvent, logApplicationFailure } from '@/services/request-diagnostics';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;

  const redisHost = process.env.REDIS_HOST;
  if (!redisHost) return null;

  const redisPassword = process.env.REDIS_PASSWORD;
  const redisPort = process.env.REDIS_PORT || '6379';

  const client = createClient({
    socket: {
      host: redisHost,
      port: Number(redisPort),
      reconnectStrategy: retries => Math.min(retries * 100, 3000),
    },
    password: redisPassword || undefined,
  }) as RedisClientType;

  client.on('error', err => logApplicationFailure('Redis connection', err));
  client.on('connect', () => logApplicationEvent('Connected to Redis'));
  client.on('reconnecting', () => logApplicationEvent('Redis reconnecting...'));

  await client.connect();
  redisClient = client;
  return client;
}
