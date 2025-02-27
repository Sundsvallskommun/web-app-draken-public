import { MUNICIPALITY_ID } from '@/config';
import { RequestWithUser } from '@/interfaces/auth.interface';
import ApiService from '@/services/api.service';
import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

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

@Controller()
export class ActiveDirectoryController {
  private apiService = new ApiService();

  @Get('/users/admins')
  @OpenAPI({ summary: 'Return all users in configured admin group' })
  @UseBefore(authMiddleware)
  async usersInAdminGroup(@Req() req: RequestWithUser, @Res() response: any): Promise<ResponseData<AdUser>> {
    const domain = 'personal';
    // ÅNGE TODO
    // När Ånges AD-grupper går att söka i via detta APi behöver möjligen versionen ändras (till 2.0?)
    // och möjligen ett MUNICIPALITY_ID läggas till, möjligen såsom nedan.
    //
    // const url = `activedirectory/2.0/${MUNICIPALITY_ID}/groupmembers/${domain}/${process.env.ADMIN_GROUP}`;
    //
    const url = `activedirectory/1.0/groupmembers/${domain}/${process.env.ADMIN_GROUP}`;
    const res = await this.apiService.get<AdUser[]>({ url }, req.user);
    return response.status(200).send({ data: res.data.map(u => ({ displayName: u.displayName, name: u.name, guid: u.guid })), message: 'ok' });
  }
}
