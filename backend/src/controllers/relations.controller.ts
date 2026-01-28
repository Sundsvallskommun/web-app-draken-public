import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Relation, RelationPagedResponse } from '@/data-contracts/relations/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class RelationsController {
  private apiService = new ApiService();
  private SERVICE = apiServiceName('relations');

  @Post('/relations')
  @HttpCode(201)
  @OpenAPI({ summary: 'Create relation' })
  @UseBefore(authMiddleware)
  async createRelation(@Req() req: RequestWithUser, @Body() relationbody: Relation): Promise<{ data: any; message: string }> {
    const url = `${MUNICIPALITY_ID}/relations`;
    const modifiedRelationBody = {
      ...relationbody,
      source: {
        ...relationbody.source,
        namespace: relationbody.source.service === 'supportmanagement' ? process.env.SUPPORTMANAGEMENT_NAMESPACE : process.env.CASEDATA_NAMESPACE,
      },
    };
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.post<any, any>({ url, baseURL, data: modifiedRelationBody }, req.user).catch(e => {
      console.log('Something went wrong when creating relation: ' + e);
      throw e;
    });
    return { data: response.data, message: `Relation created` };
  }

  @Delete('/relations/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Delete a relation' })
  @UseBefore(authMiddleware)
  async deleteRelation(@Req() req: RequestWithUser, @Param('id') id: string): Promise<{ data: boolean; message: string }> {
    const baseURL = apiURL(this.SERVICE);
    if (!id) {
      console.log('Id not found. Cannot delete relation without id.');
    }
    const url = `${MUNICIPALITY_ID}/relations/${id}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Relation with id ${id} removed` };
  }

  @Get('/sourcerelations/:sort/:query')
  @OpenAPI({ summary: 'Find matching relations' })
  @UseBefore(authMiddleware)
  async getSourceRelations(
    @Req() req: RequestWithUser,
    @Param('query') query: string,
    @Param('sort') sort: string,
  ): Promise<{ data: RelationPagedResponse; message: string }> {
    const url = `${MUNICIPALITY_ID}/relations?filter=source.resourceId%3A%27${query}%27&sortDirection=${sort}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<RelationPagedResponse>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data, message: 'success' };
  }

  @Get('/targetrelations/:sort/:query')
  @OpenAPI({ summary: 'Find matching relations' })
  @UseBefore(authMiddleware)
  async getTargetRelations(
    @Req() req: RequestWithUser,
    @Param('query') query: string,
    @Param('sort') sort: string,
  ): Promise<{ data: RelationPagedResponse; message: string }> {
    const url = `${MUNICIPALITY_ID}/relations?filter=target.resourceId%3A%27${query}%27&sortDirection=${sort}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<RelationPagedResponse>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data, message: 'success' };
  }
}
