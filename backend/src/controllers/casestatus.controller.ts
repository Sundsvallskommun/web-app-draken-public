import { Controller, Get, Param, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { CaseStatusResponse } from '@/data-contracts/casestatus/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';

// Kontakt Sundsvall is the only drake allowed to see errands across namespaces. Every other
// drake is limited to its own namespace(s), read from the environment.
const CONTACTSUNDSVALL_NAMESPACE = 'CONTACTSUNDSVALL';
const ownNamespaces: string[] = [CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE].filter((namespace): namespace is string => !!namespace);
const isContactSundsvall = ownNamespaces.includes(CONTACTSUNDSVALL_NAMESPACE);

// Broad, cross-namespace filter kept for Kontakt Sundsvall (unchanged behavior).
const broadAllowedNamespaces: string[] = ['SBK_MEX', 'SBK_PARKING_PERMIT', 'CONTACTSUNDSVALL'];
const broadAllowedSystems: string[] = ['OPEN_E_PLATFORM', 'BYGGR'];
const broadCaseIsAllowed = (c: CaseStatusResponse) =>
  (!!c.namespace && broadAllowedNamespaces.includes(c.namespace)) ||
  (typeof c.namespace === 'undefined' && !!c.system && broadAllowedSystems.includes(c.system));

// Limited filter for all other drakar: only errands within the drake's own namespace.
const ownNamespaceOnly = (c: CaseStatusResponse) => !!c.namespace && ownNamespaces.includes(c.namespace);

// Automatic listing (by owner party-/organization number) uses the broad filter for Kontakt
// Sundsvall and the own-namespace filter for every other drake.
const caseIsAllowed = isContactSundsvall ? broadCaseIsAllowed : ownNamespaceOnly;

@Controller()
export class CaseStatusController {
  private apiService = new ApiService();

  private SERVICE = apiServiceName('casestatus');

  @Get('/:municipalityId/party/:partyId/statuses')
  @OpenAPI({ summary: 'Get all statuses connected to a partyId' })
  @UseBefore(authMiddleware)
  async getStatusesUsingPartyId(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('partyId') partyId: string,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/party/${partyId}/statuses`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<any>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data.filter(caseIsAllowed), message: 'success' };
  }

  @Get('/:municipalityId/:organizationNumber/statuses')
  @OpenAPI({ summary: 'Get all statuses connected to a organizationNumber' })
  @UseBefore(authMiddleware)
  async getStatusesUsingOrganizationNumber(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('organizationNumber') organizationNumber: string,
  ): Promise<{ data: any; message: string }> {
    const url = `${municipalityId}/${organizationNumber}/statuses`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<any>({ url, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    return { data: res.data.filter(caseIsAllowed), message: 'success' };
  }

  @Get('/:municipalityId/errands/statuses/:query')
  @OpenAPI({ summary: 'Get errand statuses by errandNumber and propertyDesignation' })
  @UseBefore(authMiddleware)
  async getErrandStatus(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('query') query: string,
  ): Promise<{ data: any; message: string }> {
    const urlErrandNumber = `${municipalityId}/errands/statuses?errandNumber=${query}`;
    const urlPropertyDesignation = `${municipalityId}/errands/statuses?propertyDesignation=${query}`;
    const baseURL = apiURL(this.SERVICE);
    const resErrandNumber = await this.apiService.get<any>({ url: urlErrandNumber, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    const resPropertyDesignation = await this.apiService.get<any>({ url: urlPropertyDesignation, baseURL }, req.user).catch(e => {
      logger.error('Error when fetching relations: ', e);
      throw e;
    });
    // Manual search stays unfiltered for Kontakt Sundsvall; every other drake may only find and
    // link errands within its own namespace.
    const combined: CaseStatusResponse[] = [...resErrandNumber.data, ...resPropertyDesignation.data];
    return { data: isContactSundsvall ? combined : combined.filter(ownNamespaceOnly), message: 'success' };
  }
}
