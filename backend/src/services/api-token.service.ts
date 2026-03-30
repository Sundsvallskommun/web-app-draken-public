import qs from 'qs';
import axios from 'axios';
import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';
import { getRedisClient } from '@utils/redis';
import { apiURL } from '@utils/util';

export interface Token {
  access_token: string;
  expires_in: number;
}

const REDIS_TOKEN_KEY = 'wso2:access_token';
const REDIS_EXPIRES_KEY = 'wso2:token_expires';

// In-memory fallback when Redis is not available
let c_access_token = '';
let c_token_expires = 0;

class ApiTokenService {
  public async getToken(): Promise<string> {
    const redis = getRedisClient();

    if (redis) {
      try {
        const [token, expires] = await Promise.all([redis.get(REDIS_TOKEN_KEY), redis.get(REDIS_EXPIRES_KEY)]);

        if (token && expires && Date.now() < Number(expires)) {
          return token;
        }
      } catch (err) {
        logger.error(`Redis token read failed, falling back to fetch: ${err}`);
      }
    } else if (Date.now() < c_token_expires && c_access_token) {
      return c_access_token;
    }

    logger.info('Getting oauth API token');
    await this.fetchToken();
    return c_access_token;
  }

  public async setToken(token: Token) {
    const expiresAt = Date.now() + (token.expires_in * 1000 - 10000);

    // Always keep in-memory as fallback
    c_access_token = token.access_token;
    c_token_expires = expiresAt;

    const redis = getRedisClient();
    if (redis) {
      try {
        const ttlSeconds = Math.max(1, token.expires_in - 10);
        await redis.set(REDIS_TOKEN_KEY, token.access_token, { EX: ttlSeconds });
        await redis.set(REDIS_EXPIRES_KEY, String(expiresAt), { EX: ttlSeconds });
        logger.info(`Token cached in Redis, valid for ${token.expires_in}s`);
      } catch (err) {
        logger.error(`Redis token write failed: ${err}`);
      }
    }

    logger.info(`Token valid for: ${token.expires_in}s`);
    logger.info(`Token expires at: ${new Date(expiresAt).toISOString()}`);
  }

  public async fetchToken(): Promise<string> {
    const clientKey = process.env.CLIENT_KEY;
    const clientSecret = process.env.CLIENT_SECRET;
    const authString = Buffer.from(`${clientKey}:${clientSecret}`, 'utf-8').toString('base64');

    try {
      const { data } = await axios({
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + authString,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify({
          grant_type: 'client_credentials',
        }),
        url: apiURL('token'),
      });
      const token = data as Token;

      if (!token) throw new HttpException(502, 'Bad Gateway');
      await this.setToken(token);

      return c_access_token;
    } catch (error) {
      console.error('failed to fetch access token', error);
      throw new HttpException(502, 'Bad Gateway');
    }
  }
}

export default ApiTokenService;
