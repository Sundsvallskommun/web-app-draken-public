import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { CitizenExtended, PersonGuidBatch } from '@/data-contracts/citizen/data-contracts';
import { OrganizationEngagement } from '@/data-contracts/legalentity/data-contracts';
import { Errand, Parameter, Stakeholder } from '@/data-contracts/supportmanagement/data-contracts';
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

const PBI_PARAMETER = 'PBI';
const PBI_CONTACT_ROLE = 'CONTACT';
const pbiParameter: Parameter = { key: PBI_PARAMETER, values: ['true'] };

const PERSON_IDENTITY_TYPES = new Set(['PERSONNUMMER', 'SAMORDNINGSNUMMER']);

const PBI_ASSESSMENT_PARAMETER = 'PBI_ASSESSMENT';
const PBI_ASSESSMENT_COMMENT_PARAMETER = 'PBI_ASSESSMENT_COMMENT';
const PBI_ASSESSMENTS = ['PENDING', 'APPROVED', 'DEFICIENCY'];

const PBI_SOURCE_PARAMETER = 'PBI_SOURCE';
const PBI_ADDED_BY_HAND = 'MANUAL';
const PBI_ROLE_PARAMETER = 'PBI_ROLE';
const PBI_ROLE_MAX_LENGTH = 200;

const SUPPORT_PARAMETER_VALUE_MAX_LENGTH = 3000;

export class MarkPbiDto {
  @IsUUID()
  partyId!: string;
}

export class AddPbiByHandDto {
  @IsUUID()
  partyId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(PBI_ROLE_MAX_LENGTH)
  role?: string;
}

export class AssessPbiDto {
  @IsIn(PBI_ASSESSMENTS)
  assessment!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SUPPORT_PARAMETER_VALUE_MAX_LENGTH)
  comment?: string;
}

interface PbiCandidate extends OrganizationEngagement {
  partyId?: string;
  marked: boolean;
  unresolved: boolean;
  assessment?: string;
  assessmentComment?: string;
}

interface PbiPerson {
  partyId: string;
  name: string;
  identityCode: string;
  roles: string;
  addedByHand: boolean;
  assessment?: string;
  assessmentComment?: string;
}

const isPersonIdentity = (engagement: OrganizationEngagement): boolean => {
  const code = engagement.identity?.code ?? '';
  return PERSON_IDENTITY_TYPES.has(engagement.identity?.type ?? '') && code.length === 12 && luhnCheck(code);
};

const companyPartyId = (errand: Errand): string | undefined =>
  errand.stakeholders?.find(stakeholder => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY')?.externalId;

const hasPbiParameter = (stakeholder: Stakeholder): boolean =>
  !!stakeholder.parameters?.some(parameter => parameter.key === PBI_PARAMETER && parameter.values?.includes('true'));

const isPbi = (partyId: string) => (stakeholder: Stakeholder) => stakeholder.externalId === partyId && hasPbiParameter(stakeholder);

const PBI_PARAMETERS = [PBI_PARAMETER, PBI_SOURCE_PARAMETER, PBI_ROLE_PARAMETER, PBI_ASSESSMENT_PARAMETER, PBI_ASSESSMENT_COMMENT_PARAMETER];

const engagementRoles = (engagement: OrganizationEngagement | undefined): string =>
  (engagement?.relations ?? [])
    .map(relation => relation.description)
    .filter((description): description is string => !!description)
    .join(', ');

const withoutPbiParameters = (stakeholder: Stakeholder): Parameter[] =>
  (stakeholder.parameters ?? []).filter(parameter => !PBI_PARAMETERS.includes(parameter.key ?? ''));

const valueOfParameter = (stakeholder: Stakeholder | undefined, key: string): string | undefined =>
  stakeholder?.parameters?.find(parameter => parameter.key === key)?.values?.[0] || undefined;

/** A stakeholder that exists only because a handler named them a person of significant influence. */
const wasAddedByHand = (stakeholder: Stakeholder): boolean => valueOfParameter(stakeholder, PBI_SOURCE_PARAMETER) === PBI_ADDED_BY_HAND;

/** Everything the marking carries. Rewriting a verdict must not drop where the person came from or what they are. */
const pbiParametersOf = (stakeholder: Stakeholder, verdict?: AssessPbiDto): Parameter[] => {
  const role = valueOfParameter(stakeholder, PBI_ROLE_PARAMETER);
  return [
    pbiParameter,
    ...(wasAddedByHand(stakeholder) ? [{ key: PBI_SOURCE_PARAMETER, values: [PBI_ADDED_BY_HAND] }] : []),
    ...(role ? [{ key: PBI_ROLE_PARAMETER, values: [role] }] : []),
    ...(verdict ? [{ key: PBI_ASSESSMENT_PARAMETER, values: [verdict.assessment] }] : []),
    ...(verdict?.comment?.trim() ? [{ key: PBI_ASSESSMENT_COMMENT_PARAMETER, values: [verdict.comment.trim()] }] : []),
  ];
};

const markedStakeholders = (errand: Errand): Stakeholder[] =>
  (errand.stakeholders ?? []).filter(stakeholder => hasPbiParameter(stakeholder) && stakeholder.externalId);

const stakeholderName = (stakeholder: Stakeholder): string => [stakeholder.firstName, stakeholder.lastName].filter(Boolean).join(' ');

const assessmentsByPartyId = (errand: Errand): Map<string, Pick<PbiCandidate, 'assessment' | 'assessmentComment'>> =>
  new Map(
    markedStakeholders(errand).map(stakeholder => [
      stakeholder.externalId as string,
      {
        assessment: valueOfParameter(stakeholder, PBI_ASSESSMENT_PARAMETER),
        assessmentComment: valueOfParameter(stakeholder, PBI_ASSESSMENT_COMMENT_PARAMETER),
      },
    ]),
  );

const markedPartyIds = (errand: Errand): Set<string> => new Set(markedStakeholders(errand).map(stakeholder => stakeholder.externalId as string));

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

  private async personPartyIds(municipalityId: string, personalNumbers: string[], user: RequestWithUser['user']): Promise<Map<string, string>> {
    if (personalNumbers.length === 0) return new Map();
    return this.apiService
      .post<PersonGuidBatch[], string[]>({ url: `${this.CITIZEN_SERVICE}/${municipalityId}/guid/batch`, data: personalNumbers }, user)
      .then(
        res =>
          new Map(
            (res.data ?? [])
              .filter(result => result.success && result.personNumber && result.personId)
              .map(result => [result.personNumber as string, result.personId as string]),
          ),
      )
      .catch(() => {
        logger.error('Could not resolve the party ids of the people engaged in the company');
        return new Map();
      });
  }

  private async readCandidates(municipalityId: string, errand: Errand, user: RequestWithUser['user']): Promise<PbiCandidate[]> {
    const company = companyPartyId(errand);
    if (!company) return [];

    const { engagements } = await this.organizationService.getOrganizationEngagements(municipalityId, company, user);
    const marked = markedPartyIds(errand);
    const assessments = assessmentsByPartyId(errand);
    const people = (engagements ?? []).filter(isPersonIdentity).map(engagement => engagement.identity!.code!);
    const partyIds = await this.personPartyIds(municipalityId, people, user);

    return (engagements ?? []).map(engagement => {
      const person = isPersonIdentity(engagement);
      const partyId = person ? partyIds.get(engagement.identity!.code!) : undefined;
      const assessed = partyId ? assessments.get(partyId) : undefined;
      return {
        ...engagement,
        partyId,
        marked: !!partyId && marked.has(partyId),
        unresolved: person && !partyId,
        ...assessed,
      };
    });
  }

  /**
   * The table a handler marks people in and the people actually named on the errand, read together from
   * one look at the company data. The marking lives on the stakeholder, so a person entered by hand
   * stands beside one taken from the company data, and an errand with no company data still has its people.
   */
  private async readPbi(
    municipalityId: string,
    errand: Errand,
    user: RequestWithUser['user'],
  ): Promise<{ candidates: PbiCandidate[]; people: PbiPerson[] }> {
    const candidates = await this.readCandidates(municipalityId, errand, user);
    const engagementOf = new Map(candidates.filter(candidate => candidate.partyId).map(candidate => [candidate.partyId as string, candidate]));

    const people = await Promise.all(
      markedStakeholders(errand).map(async stakeholder => {
        const partyId = stakeholder.externalId as string;
        const engagement = engagementOf.get(partyId);
        return {
          partyId,
          name: engagement?.name || stakeholderName(stakeholder),
          identityCode: engagement?.identity?.code ?? (await this.personIdentityCode(municipalityId, partyId, user)),
          roles: engagement ? engagementRoles(engagement) : (valueOfParameter(stakeholder, PBI_ROLE_PARAMETER) ?? ''),
          addedByHand: wasAddedByHand(stakeholder),
          assessment: valueOfParameter(stakeholder, PBI_ASSESSMENT_PARAMETER),
          assessmentComment: valueOfParameter(stakeholder, PBI_ASSESSMENT_COMMENT_PARAMETER),
        };
      }),
    );

    return { candidates, people };
  }

  /**
   * The personal number of someone the company data does not name. It is read back from Citizen at every
   * reading rather than kept on the errand, since an errand never holds a personal number.
   */
  private async personIdentityCode(municipalityId: string, partyId: string, user: RequestWithUser['user']): Promise<string> {
    const res = await this.apiService
      .get<string>({ url: `${this.CITIZEN_SERVICE}/${municipalityId}/${partyId}/personnumber` }, user)
      .catch(() => undefined);
    return res?.data ? `${res.data}` : '';
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

  @Get('/supportpbi/:municipalityId/:id')
  @OpenAPI({ summary: 'Get the people the company data offers and the people named on the errand as persons of significant influence' })
  @UseBefore(authMiddleware)
  async fetchPbi(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const errand = await this.readErrand(municipalityId, id, req.user);
    return response.status(200).send(await this.readPbi(municipalityId, errand, req.user));
  }

  @Post('/supportpbi/:municipalityId/:id/person')
  @HttpCode(201)
  @OpenAPI({ summary: 'Name a person a person of significant influence without going through the company data' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(AddPbiByHandDto, 'body'))
  async addPbiByHand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: AddPbiByHandDto,
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

    const role = data.role?.trim();
    const roleParameter = role ? [{ key: PBI_ROLE_PARAMETER, values: [role] }] : [];
    const existing = stakeholders.findIndex(stakeholder => stakeholder.externalId === data.partyId);
    const named: Stakeholder[] =
      existing >= 0
        ? stakeholders.map((stakeholder, index) =>
            index === existing ? { ...stakeholder, parameters: [...withoutPbiParameters(stakeholder), pbiParameter, ...roleParameter] } : stakeholder,
          )
        : [
            ...stakeholders,
            {
              role: PBI_CONTACT_ROLE,
              externalId: data.partyId,
              externalIdType: 'PRIVATE',
              ...(await this.personName(municipalityId, data.partyId, req.user)),
              contactChannels: [],
              parameters: [pbiParameter, { key: PBI_SOURCE_PARAMETER, values: [PBI_ADDED_BY_HAND] }, ...roleParameter],
            },
          ];
    await this.writeStakeholders(municipalityId, errand, named, req.user);
    return response.status(201).send({ partyId: data.partyId });
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

    const existing = stakeholders.findIndex(stakeholder => stakeholder.externalId === data.partyId);
    const marked: Stakeholder[] =
      existing >= 0
        ? stakeholders.map((stakeholder, index) =>
            index === existing ? { ...stakeholder, parameters: [...withoutPbiParameters(stakeholder), pbiParameter] } : stakeholder,
          )
        : [
            ...stakeholders,
            {
              role: PBI_CONTACT_ROLE,
              externalId: data.partyId,
              externalIdType: 'PRIVATE',
              ...(await this.personName(municipalityId, data.partyId, req.user)),
              contactChannels: [],
              parameters: [pbiParameter],
            },
          ];
    await this.writeStakeholders(municipalityId, errand, marked, req.user);
    return response.status(201).send({ partyId: data.partyId });
  }

  /**
   * A person taken from the company data keeps their place among the stakeholders and only loses the
   * marking, so the table can show them unchecked. One a handler entered by hand has no other reason
   * to be on the errand and leaves with it.
   */
  @Delete('/supportpbi/:municipalityId/:id/:partyId')
  @OpenAPI({ summary: 'Stop naming a person a person of significant influence' })
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
    const named = stakeholders.find(isPbi(partyId));
    if (!named) {
      throw new HttpException(404, 'No person of significant influence with that party id on the errand');
    }

    const remaining = wasAddedByHand(named)
      ? stakeholders.filter(stakeholder => stakeholder !== named)
      : stakeholders.map(stakeholder => (stakeholder === named ? { ...stakeholder, parameters: withoutPbiParameters(stakeholder) } : stakeholder));

    await this.writeStakeholders(municipalityId, errand, remaining, req.user);
    return response.status(204).send();
  }

  @Patch('/supportpbi/:municipalityId/:id/:partyId/assessment')
  @OpenAPI({ summary: 'Set the verdict on a person of significant influence' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(AssessPbiDto, 'body'))
  async assessPbi(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('partyId') partyId: string,
    @Body() data: AssessPbiDto,
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
      stakeholders.map(stakeholder =>
        isPbi(partyId)(stakeholder)
          ? { ...stakeholder, parameters: [...withoutPbiParameters(stakeholder), ...pbiParametersOf(stakeholder, data)] }
          : stakeholder,
      ),
      req.user,
    );
    return response.status(204).send();
  }
}
