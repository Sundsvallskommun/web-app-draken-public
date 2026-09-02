import { Response } from 'express';
import { Controller, Get, Param, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { DifferenceResponse, PageEvent } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameterService } from '@/services/support-json-parameter.service';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isAccessDenied = (error: unknown): boolean => isRecord(error) && (error.status === 401 || error.status === 403);
const isJsonParameterRevisionPath = (path: string | undefined): boolean =>
  !path || path === '/' || path === '/jsonParameters' || path.startsWith('/jsonParameters/');

const redactJsonParameterRevisionOperations = (difference: DifferenceResponse): DifferenceResponse => ({
  ...difference,
  operations: difference.operations?.filter(operation => !isJsonParameterRevisionPath(operation.path)),
});

@Controller()
export class SupportHistoryController {
  private apiService = new ApiService();
  private readonly investigationPolicyService: SupportInvestigationPolicyService;
  private readonly investigationDocumentService: SupportJsonParameterService;
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private SERVICE = apiServiceName('supportmanagement');

  constructor(
    investigationPolicyService = new SupportInvestigationPolicyService(),
    investigationDocumentService = new SupportJsonParameterService({ namespace: SUPPORTMANAGEMENT_NAMESPACE ?? '' }),
  ) {
    this.investigationPolicyService = investigationPolicyService;
    this.investigationDocumentService = investigationDocumentService;
  }

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
    const documents = this.investigationPolicyService.profile.documents;
    const [res, canReadInvestigationDocuments] = await Promise.all([
      this.apiService.get<DifferenceResponse>({ url, propagateClientError: true }, req.user),
      documents.length === 0
        ? Promise.resolve(true)
        : this.investigationDocumentService
            .verifyReadableDocuments({ definitions: documents, municipalityId, errandId: id, user: req.user })
            .then(() => true)
            .catch(error => {
              if (isAccessDenied(error)) return false;
              throw error;
            }),
    ]);
    return response.status(200).send(canReadInvestigationDocuments ? res.data : redactJsonParameterRevisionOperations(res.data));
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
