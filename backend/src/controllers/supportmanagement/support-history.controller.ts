import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { DifferenceResponse, PageEvent } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { Response } from 'express';
import { Controller, Get, Param, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class SupportHistoryController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = apiServiceName('supportmanagement');

  @Get('/supporthistory/:municipalityId/:id')
  @OpenAPI({ summary: 'Get events for errand' })
  @UseBefore(authMiddleware)
  async fetchSupportEvents(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: Response<PageEvent, any>,
  ): Promise<Response<PageEvent, any>> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/events?page=0&size=100&sort=created%2Cdesc`;
    const res = await this.apiService.get<PageEvent>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Get('/supporthistory/:municipalityId/:id/revisions/difference/')
  @OpenAPI({ summary: 'Get diff between revisions on an errand' })
  @UseBefore(authMiddleware)
  async fetchErrandRevisionsDiff(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('source') source: number,
    @QueryParam('target') target: number,
    @Res() response: Response<DifferenceResponse, any>,
  ): Promise<Response<DifferenceResponse, any>> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/revisions/difference?source=${source}&target=${target}`;
    const res = await this.apiService.get<DifferenceResponse>({ url }, req.user);
    return response.status(200).send(res.data);
  }

  @Get('/supporthistory/:municipalityId/:id/notes/:noteId/revisions/difference/')
  @OpenAPI({ summary: 'Get diff between revisions on a note' })
  @UseBefore(authMiddleware)
  async fetchNoteRevisionsDiff(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('source') source: number,
    @QueryParam('target') target: number,
    @Res() response: Response<DifferenceResponse, any>,
  ): Promise<Response<DifferenceResponse, any>> {
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}/notes/${noteId}/revisions/difference?source=${source}&target=${target}`;
    const res = await this.apiService.get<DifferenceResponse>({ url }, req.user);
    return response.status(200).send(res.data);
  }
}
