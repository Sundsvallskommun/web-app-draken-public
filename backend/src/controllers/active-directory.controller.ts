import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { RequestWithUser } from '@/interfaces/auth.interface';
import { AssignableHandler, HandlerDirectoryService } from '@/services/handler-directory.service';

export type { AdUser, AssignableHandler } from '@/services/handler-directory.service';

export interface ResponseData<T> {
  data: T;
  message: string;
}

/** Presentation metadata for one handler role, in the order the deployment configured it. */
export interface AssignableHandlerRole {
  key: string;
  label: string;
}

export interface AssignableHandlersResponse extends ResponseData<AssignableHandler[]> {
  /** Omitted entirely when the deployment assigns without roles, so the flat selector is unchanged. */
  roles?: AssignableHandlerRole[];
}

@Controller()
export class ActiveDirectoryController {
  private readonly handlerDirectory = new HandlerDirectoryService();

  @Get('/users/admins')
  @OpenAPI({ summary: 'Return users in the configured assignable handler groups' })
  @UseBefore(authMiddleware)
  async getAssignableHandlers(@Req() req: RequestWithUser): Promise<AssignableHandlersResponse> {
    const data = await this.handlerDirectory.listHandlers(req.user);
    const roles = this.handlerDirectory.roles;
    if (!roles) return { data, message: 'ok' };
    return { data, roles: roles.map(({ key, label }) => ({ key, label })), message: 'ok' };
  }
}
