import { IsUUID } from 'class-validator';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { CitizenExtended } from '@/data-contracts/citizen/data-contracts';
import { OrganizationEngagement } from '@/data-contracts/legalentity/data-contracts';
import { Errand, Stakeholder } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { OrganizationService } from '@/services/organization.service';
import { stripErrandVersions } from '@/services/support-errand.service';
import { logger } from '@/utils/logger';
import { apiURL, luhnCheck } from '@/utils/util';

const PBI_ROLE = 'PBI';

const PERSON_IDENTITY_TYPES = new Set(['PERSONNUMMER', 'SAMORDNINGSNUMMER']);

export class MarkPbiDto {
  @IsUUID()
  partyId!: string;
}

interface PbiCandidate extends OrganizationEngagement {
  partyId?: string;
  marked: boolean;
}

const isPersonIdentity = (engagement: OrganizationEngagement): boolean => {
  const code = engagement.identity?.code ?? '';
  return PERSON_IDENTITY_TYPES.has(engagement.identity?.type ?? '') && code.length === 12 && luhnCheck(code);
};

const companyPartyId = (errand: Errand): string | undefined =>
  errand.stakeholders?.find(stakeholder => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY')?.externalId;

const isPbi = (partyId: string) => (stakeholder: Stakeholder) => stakeholder.role === PBI_ROLE && stakeholder.externalId === partyId;

const markedPartyIds = (errand: Errand): Set<string> =>
  new Set(
    (errand.stakeholders ?? [])
      .filter(stakeholder => stakeholder.role === PBI_ROLE && stakeholder.externalId)
      .map(stakeholder => stakeholder.externalId as string),
  );

@Controller()
export class SupportPbiController {
  private readonly apiService = new ApiService();
  private readonly organizationService = new OrganizationService();
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly SERVICE = apiServiceName('supportmanagement');
  private readonly CITIZEN_SERVICE = apiServiceName('citizen');

  private readonly errandUrl = (municipalityId: string, errandId: string): string => `${municipalityId}/${this.namespace}/errands/${errandId}`;

  private async readErrand(municipalityId: string, errandId: string, user: RequestWithUser['user']): Promise<Errand> {
    const res = await this.apiService.get<Errand>(
      { url: this.errandUrl(municipalityId, errandId), baseURL: apiURL(this.SERVICE), propagateClientError: true },
      user,
    );
    return res.data;
  }

  private async personPartyId(municipalityId: string, personalNumber: string, user: RequestWithUser['user']): Promise<string | undefined> {
    return this.apiService
      .get<string>({ url: `${this.CITIZEN_SERVICE}/${municipalityId}/${personalNumber}/guid` }, user)
      .then(res => res.data || undefined)
      .catch(() => {
        logger.error('Could not resolve the party id of a person engaged in the company');
        return undefined;
      });
  }

  private async readCandidates(municipalityId: string, errand: Errand, user: RequestWithUser['user']): Promise<PbiCandidate[]> {
    const company = companyPartyId(errand);
    if (!company) return [];

    const { engagements } = await this.organizationService.getOrganizationEngagements(municipalityId, company, user);
    const marked = markedPartyIds(errand);

    return Promise.all(
      (engagements ?? []).map(async engagement => {
        const partyId = isPersonIdentity(engagement) ? await this.personPartyId(municipalityId, engagement.identity!.code!, user) : undefined;
        return { ...engagement, partyId, marked: !!partyId && marked.has(partyId) };
      }),
    );
  }

  private async personName(
    municipalityId: string,
    partyId: string,
    user: RequestWithUser['user'],
  ): Promise<Pick<Stakeholder, 'firstName' | 'lastName'>> {
    const res = await this.apiService.get<CitizenExtended>({ url: `${this.CITIZEN_SERVICE}/${municipalityId}/${partyId}` }, user);
    return { firstName: res.data.givenname ?? undefined, lastName: res.data.lastname ?? undefined };
  }

  private async writeStakeholders(municipalityId: string, errand: Errand, stakeholders: Stakeholder[], user: RequestWithUser['user']): Promise<void> {
    const { stakeholders: withoutVersions } = stripErrandVersions({ stakeholders });
    await this.apiService.patch<Errand, Partial<Errand>>(
      {
        url: this.errandUrl(municipalityId, errand.id!),
        baseURL: apiURL(this.SERVICE),
        data: { stakeholders: withoutVersions },
        headers: { 'If-Match': `"${errand.version}"` },
        propagateClientError: true,
      },
      user,
    );
  }

  @Get('/supportpbi/:municipalityId/:id/candidates')
  @OpenAPI({ summary: 'Get the people engaged in the applicant company, and whether each is marked as a person of significant influence' })
  @UseBefore(authMiddleware)
  async fetchCandidates(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const errand = await this.readErrand(municipalityId, id, req.user);
    return response.status(200).send(await this.readCandidates(municipalityId, errand, req.user));
  }

  @Post('/supportpbi/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Mark a person engaged in the applicant company as a person of significant influence' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(MarkPbiDto, 'body'))
  async markPbi(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: MarkPbiDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const errand = await this.readErrand(municipalityId, id, req.user);
    const stakeholders = errand.stakeholders ?? [];
    if (stakeholders.some(isPbi(data.partyId))) {
      return response.status(200).send({ partyId: data.partyId });
    }

    const candidates = await this.readCandidates(municipalityId, errand, req.user);
    if (!candidates.some(candidate => candidate.partyId === data.partyId)) {
      throw new HttpException(400, 'The person is not engaged in the applicant company');
    }

    const pbi: Stakeholder = {
      role: PBI_ROLE,
      externalId: data.partyId,
      externalIdType: 'PRIVATE',
      ...(await this.personName(municipalityId, data.partyId, req.user)),
      contactChannels: [],
      parameters: [],
    };
    await this.writeStakeholders(municipalityId, errand, [...stakeholders, pbi], req.user);
    return response.status(201).send({ partyId: data.partyId });
  }

  @Delete('/supportpbi/:municipalityId/:id/:partyId')
  @OpenAPI({ summary: 'Remove the marking of a person of significant influence' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async unmarkPbi(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('partyId') partyId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const errand = await this.readErrand(municipalityId, id, req.user);
    const stakeholders = errand.stakeholders ?? [];
    if (!stakeholders.some(isPbi(partyId))) {
      throw new HttpException(404, 'No person of significant influence with that party id on the errand');
    }
    await this.writeStakeholders(
      municipalityId,
      errand,
      stakeholders.filter(stakeholder => !isPbi(partyId)(stakeholder)),
      req.user,
    );
    return response.status(204).send();
  }
}
