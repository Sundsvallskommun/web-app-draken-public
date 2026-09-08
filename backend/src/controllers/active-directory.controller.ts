import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { resolveAssignableHandlerGroups } from '@/config/assignable-handler-groups';
import { RequestWithUser } from '@/interfaces/auth.interface';
import ApiService from '@/services/api.service';

export interface ResponseData<T> {
  data: T;
  message: string;
}

export interface AdUser {
  description?: string;
  displayName: string;
  domain?: string;
  guid?: string;
  isLinked?: string;
  name: string;
  ouPath?: string;
  personId?: string;
  schemaClassName?: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
type AssignableHandler = Pick<AdUser, 'displayName' | 'name' | 'guid'>;

@Controller()
export class ActiveDirectoryController {
  private readonly apiService = new ApiService();
  private readonly handlerGroups = resolveAssignableHandlerGroups();
  private cachedHandlers?: AssignableHandler[];
  private cacheTimestamp = 0;

  @Get('/users/admins')
  @OpenAPI({ summary: 'Return users in the configured assignable handler groups' })
  @UseBefore(authMiddleware)
  async getAssignableHandlers(@Req() req: RequestWithUser): Promise<ResponseData<AssignableHandler[]>> {
    const now = Date.now();

    if (this.cachedHandlers && now - this.cacheTimestamp < CACHE_TTL_MS) {
      return { data: this.cachedHandlers, message: 'ok' };
    }

    const baseUrl = `${apiServiceName('activedirectory')}/${MUNICIPALITY_ID}/groupmembers/${encodeURIComponent(process.env.DOMAIN ?? '')}`;
    // Publish/cache only a complete directory result. A failed group lookup must not silently omit handlers.
    const responses = await Promise.all(
      this.handlerGroups.map(group => this.apiService.get<AdUser[]>({ url: `${baseUrl}/${encodeURIComponent(group)}` }, req.user)),
    );
    const handlers = new Map<string, AssignableHandler>();
    for (const response of responses) {
      for (const user of response.data) {
        const account = user.name.toLowerCase();
        if (!handlers.has(account)) handlers.set(account, { displayName: user.displayName, name: user.name, guid: user.guid });
      }
    }
    this.cachedHandlers = [...handlers.values()];
    this.cacheTimestamp = Date.now();

    return { data: this.cachedHandlers, message: 'ok' };
  }
}
