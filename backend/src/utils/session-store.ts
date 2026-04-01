import { RedisStore } from 'connect-redis';
import session from 'express-session';
import createFileStore from 'session-file-store';

import { logger } from './logger';
import { getRedisClient } from './redis';

const SESSION_TTL = 4 * 24 * 60 * 60;

export function createSessionStore(): session.Store {
  const redisClient = getRedisClient();

  if (redisClient) {
    logger.info('Using Redis session store');
    return new RedisStore({ client: redisClient, prefix: 'sess:', ttl: SESSION_TTL });
  }

  const FileStore = createFileStore(session);
  logger.info('Using file-based session store');
  return new FileStore({ ttl: SESSION_TTL, path: './data/sessions' });
}
