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

// Casestatus visibility is decided per request from the session permission canViewOtherNamespaces
// (granted at login for the Kontakt Sundsvall drake) — never from the environment. With the
// permission a user sees errands from the allowed namespaces/systems; without it, only errands within
// the drake's own namespace.

// Broad filter: the namespaces/systems Kontakt Sundsvall is allowed to see.
const broadAllowedNamespaces: string[] = ['SBK_MEX', 'SBK_PARKING_PERMIT', 'CONTACTSUNDSVALL'];
const broadAllowedSystems: string[] = ['OPEN_E_PLATFORM', 'BYGGR'];
const broadCaseIsAllowed = (c: CaseStatusResponse) =>
  (!!c.namespace && broadAllowedNamespaces.includes(c.namespace)) ||
  (typeof c.namespace === 'undefined' && !!c.system && broadAllowedSystems.includes(c.system));

// Limited filter: only errands within the drake's own namespace(s).
const ownNamespaces: string[] = [CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE].filter((namespace): namespace is string => !!namespace);
const ownNamespaceOnly = (c: CaseStatusResponse) => !!c.namespace && ownNamespaces.includes(c.namespace);

// Shared visibility filter used by every casestatus endpoint: the broad allowed-list for users with
// the canViewOtherNamespaces permission, otherwise the drake's own namespace only.
const filterVisibleCases = (cases: CaseStatusResponse[], canViewOtherNamespaces: boolean): CaseStatusResponse[] =>
  cases.filter(canViewOtherNamespaces ? broadCaseIsAllowed : ownNamespaceOnly);

@Controller()
export class CaseStatusController {
  private apiService = new ApiService();

  private SERVICE = apiServiceName('casestatus');

  // Errands tied to a person (partyId) are filtered by the caller's canViewOtherNamespaces permission:
  // the allowed namespaces/systems with it, the drake's own namespace without it.
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
    return { data: filterVisibleCases(res.data, req.user.permissions.canViewOtherNamespaces), message: 'success' };
  }

  // Same as the partyId lookup: errands tied to an organization number are filtered by the caller's
  // canViewOtherNamespaces permission.
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
    return { data: filterVisibleCases(res.data, req.user.permissions.canViewOtherNamespaces), message: 'success' };
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
    // Manual search is filtered by the same canViewOtherNamespaces permission as the lookups above.
    const combined: CaseStatusResponse[] = [...resErrandNumber.data, ...resPropertyDesignation.data];
    return { data: filterVisibleCases(combined, req.user.permissions.canViewOtherNamespaces), message: 'success' };
  }
}
