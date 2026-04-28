import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { apiServiceName } from '@/config/api-config';
import { CaseStatusResponse } from '@/data-contracts/casestatus/data-contracts';
import { Relation, RelationPagedResponse, ResourceIdentifier } from '@/data-contracts/relations/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

@Controller()
export class RelationsController {
  private apiService = new ApiService();
  private SERVICE = apiServiceName('relations');
  private CASEDATA_SERVICE = apiServiceName('case-data');
  private SUPPORTMANAGEMENT_SERVICE = apiServiceName('supportmanagement');
  private CASESTATUS_SERVICE = apiServiceName('casestatus');

  private async fetchErrandNumber(municipalityId: string, resource: ResourceIdentifier, user: any): Promise<string> {
    const { service, namespace, resourceId } = resource;
    let url: string;
    let baseURL: string;

    if (service === 'case-data' || service === 'casedata') {
      url = `${municipalityId}/${namespace}/errands/${resourceId}`;
      baseURL = apiURL(this.CASEDATA_SERVICE);
    } else if (service === 'supportmanagement') {
      url = `${municipalityId}/${namespace}/errands/${resourceId}`;
      baseURL = apiURL(this.SUPPORTMANAGEMENT_SERVICE);
    } else {
      logger.error(`Unknown service: ${service}`);
      return '';
    }

    const res = await this.apiService.get<any>({ url, baseURL }, user).catch(e => {
      logger.error(`Error fetching errand number for ${service}/${namespace}/${resourceId}: `, e);
      return null;
    });

    return res?.data?.errandNumber ?? '';
  }

  private async fetchCaseStatus(municipalityId: string, errandNumber: string, user: any): Promise<CaseStatusResponse[]> {
    if (!errandNumber) return [];

    const url = `${municipalityId}/errands/statuses?errandNumber=${errandNumber}`;
    const baseURL = apiURL(this.CASESTATUS_SERVICE);
    const res = await this.apiService.get<CaseStatusResponse[]>({ url, baseURL }, user).catch(e => {
      logger.error(`Error fetching case status for ${errandNumber}: `, e);
      return null;
    });

    return res?.data ?? [];
  }

  @Post('/:municipalityId/relations')
  @HttpCode(201)
  @OpenAPI({ summary: 'Create relation' })
  @UseBefore(authMiddleware)
  async createRelation(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() relationbody: Relation,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/relations`;
    const modifiedRelationBody = {
      ...relationbody,
      source: {
        ...relationbody.source,
        type: 'case',
        namespace: relationbody.source.service === 'supportmanagement' ? process.env.SUPPORTMANAGEMENT_NAMESPACE : process.env.CASEDATA_NAMESPACE,
      },
      target: {
        ...relationbody.target,
        type: 'case',
      },
    };
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.post<any, any>({ url, baseURL, data: modifiedRelationBody }, req.user).catch(e => {
      console.log('Something went wrong when creating relation: ' + e);
      throw e;
    });
    return { data: response.data, message: `Relation created` };
  }

  @Delete('/:municipalityId/relations/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Delete a relation' })
  @UseBefore(authMiddleware)
  async deleteRelation(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: number,
    @Param('id') id: string,
  ): Promise<{ data: boolean; message: string }> {
    const baseURL = apiURL(this.SERVICE);
    if (!id) {
      console.log('Id not found. Cannot delete relation without id.');
    }
    const url = `${municipalityId}/relations/${id}`;
    const response = await this.apiService.delete<boolean>({ url, baseURL }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Relation with id ${id} removed` };
  }

  @Get('/:municipalityId/sourcerelations/:sort/:query')
  @OpenAPI({ summary: 'Find matching relations' })
  @UseBefore(authMiddleware)
  async getSourceRelations(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('query') query: string,
    @Param('sort') sort: string,
  ): Promise<{ data: RelationPagedResponse; message: string }> {
    const url = `${municipalityId}/relations?filter=source.resourceId%3A%27${query}%27&sortDirection=${sort}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<RelationPagedResponse>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data, message: 'success' };
  }

  @Get('/:municipalityId/targetrelations/:sort/:query')
  @OpenAPI({ summary: 'Find target relations and resolve their case statuses' })
  @UseBefore(authMiddleware)
  async getTargetRelations(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('query') query: string,
    @Param('sort') sort: string,
  ): Promise<{ data: { relations: Relation[]; caseStatuses: CaseStatusResponse[] }; message: string }> {
    const url = `${municipalityId}/relations?filter=target.resourceId%3A%27${query}%27&sortDirection=${sort}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<RelationPagedResponse>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });

    const relations = res.data.relations ?? [];

    const caseStatuses = await Promise.all(
      relations.map(async relation => {
        const errandNumber = await this.fetchErrandNumber(municipalityId, relation.source, req.user);
        return this.fetchCaseStatus(municipalityId, errandNumber, req.user);
      }),
    );

    return {
      data: {
        relations,
        caseStatuses: caseStatuses.flat(),
      },
      message: 'success',
    };
  }

  @Get('/:municipalityId/resolvedrelations/:sort/:query')
  @OpenAPI({ summary: 'Resolve source relations to case statuses' })
  @UseBefore(authMiddleware)
  async getResolvedSourceRelations(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('query') query: string,
    @Param('sort') sort: string,
  ): Promise<{ data: { relations: Relation[]; caseStatuses: CaseStatusResponse[] }; message: string }> {
    const url = `${municipalityId}/relations?filter=source.resourceId%3A%27${query}%27&sortDirection=${sort}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<RelationPagedResponse>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });

    const relations = res.data.relations ?? [];

    const caseStatuses = await Promise.all(
      relations.map(async relation => {
        const errandNumber = await this.fetchErrandNumber(municipalityId, relation.target, req.user);
        return this.fetchCaseStatus(municipalityId, errandNumber, req.user);
      }),
    );

    return {
      data: {
        relations,
        caseStatuses: caseStatuses.flat(),
      },
      message: 'success',
    };
  }
}
