import { Type as TypeTransformer } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import FormData from 'form-data';
import { Body, Controller, Get, HeaderParam, HttpCode, Param, Patch, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { APPLICATION, MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import {
  preservesIafVofInvestigationClassificationOwnerParameter,
  resolveIafVofInvestigationClassificationOwner,
} from '@/config/iaf-vof-investigation-classification';
import {
  Errand as CasedataErrandDTO,
  ErrandPriorityEnum as CasedataErrandDtoPriorityEnum,
  Stakeholder as CasedataStakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';
import { RelationPagedResponse } from '@/data-contracts/relations/data-contracts';
import {
  ContactChannel,
  Errand as SupportErrand,
  ErrandAction,
  ErrandAttachment,
  ErrandPhase,
  ExternalTag,
  Label,
  Labels as SupportLabels,
  MetadataResponse as SupportMetadata,
  Notification,
  PageErrand,
  Parameter,
  Priority as SupportPriority,
  Stakeholder as SupportStakeholder,
  Suspension,
} from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { MEXCaseType } from '@/interfaces/case-type.interface';
import { ErrandStatus } from '@/interfaces/errand-status.interface';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';
import { ContactChannelType } from '@/interfaces/support-contactchannel';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { createConversation, sendConversationTextMessage } from '@/services/message.service';
import { OrganizationService } from '@/services/organization.service';
import {
  assertRequestedErrandVersion,
  assertSupportErrandAdminAssignable,
  assertSupportErrandWritable,
  buildErrandFilter,
  buildSupportErrandClassificationUpdateBody,
  ErrandFilterInput,
  getErrandVersion,
  getNewErrandDefaults,
  NewErrandDefaults,
  requireStrongErrandVersion,
  resolveDefaultLabels,
  resolveSupportErrandClassification,
  resolveSupportErrandPhaseTransition,
  resolveSupportErrandStatusTransition,
  stripErrandVersions,
  SupportStakeholderRole,
  toAttachmentDto,
  toCasedataChannel,
  toCasedataStakeholder,
  toFacilities,
} from '@/services/support-errand.service';
import { assertSupportInvestigationClassificationContext } from '@/services/support-investigation-classification-context.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameterService } from '@/services/support-json-parameter.service';
import {
  SupportManagementLabelFilterError,
  SupportManagementLabelFilterSelection,
  SupportManagementLabelFilterService,
} from '@/services/supportmanagement-label-filter.service';
import { logger } from '@/utils/logger';
import { apiURL, formatOrgNr, luhnCheck, OrgNumberFormat, withRetries } from '@/utils/util';

export { SupportStakeholderRole };

export enum CustomerType {
  PRIVATE,
  ENTERPRISE,
  EMPLOYEE,
}

export enum Status {
  NEW = 'NEW',
  ONGOING = 'ONGOING',
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  SOLVED = 'SOLVED',
}

export enum StatusLabel {
  NEW = 'Inkommet',
  ONGOING = 'Pågående',
  PENDING = 'Komplettering',
  ASSIGNED = 'Tilldelat',
  SOLVED = 'Avslutat',
}

const getLabelFilterErrorStatus = (error: SupportManagementLabelFilterError): number => {
  if (error.source === 'selection') return 400;
  if (error.source === 'metadata') return 502;
  return 500;
};

const assertGenericUpdateFields = (data: Partial<SupportErrandDto>): void => {
  if (data.activePhaseId !== undefined) {
    throw new HttpException(400, 'Use the phase transition endpoint to change the active phase');
  }
  if (data.status !== undefined || data.resolution !== undefined || data.suspension !== undefined) {
    throw new HttpException(400, 'Use the status transition endpoint to change status, resolution or suspension');
  }
  if (data.assignedUserId !== undefined) {
    throw new HttpException(400, 'Use the administrator endpoint to change the assigned user');
  }
};

export enum Resolution {
  INFORMED = 'INFORMED',
  ESCALATED = 'ESCALATED',
  CONNECTED = 'CONNECTED',
}

export enum ResolutionLabel {
  INFORMED = 'Informerat',
  ESCALATED = 'Överlämnat',
  CONNECTED = 'Kopplat',
}

export interface SupportErrandParameters {
  name: string;
  value: string;
}

export class CExternalTag implements ExternalTag {
  @IsString()
  key!: string;
  @IsString()
  value!: string;
}

export class CParameter implements Parameter {
  @IsString()
  key!: string;
  @IsString()
  @IsOptional()
  displayName?: string;
  @IsString()
  @IsOptional()
  group?: string;
  @IsArray()
  @IsOptional()
  values!: string[];
  // Optimistic locking version, set by SupportManagement. Accepted here because the frontend echoes
  // fetched errands back, but stripped before we forward (SupportManagement rejects it on update).
  @IsNumber()
  @IsOptional()
  version?: number;
}

export class CContactChannel implements ContactChannel {
  @IsString()
  @IsOptional()
  type?: string;
  @IsString()
  @IsOptional()
  value?: string;
}

export class CSupportStakeholder implements SupportStakeholder {
  @IsString()
  @IsOptional()
  externalId?: string;
  @IsString()
  @IsOptional()
  externalIdType?: ExternalIdType;
  @IsString()
  @IsOptional()
  role?: string;
  @IsString()
  @IsOptional()
  city?: string;
  @IsString()
  @IsOptional()
  organizationName?: string;
  @IsString()
  @IsOptional()
  firstName?: string;
  @IsString()
  @IsOptional()
  lastName?: string;
  @IsString()
  @IsOptional()
  address?: string;
  @IsString()
  @IsOptional()
  careOf?: string;
  @IsString()
  @IsOptional()
  zipCode?: string;
  @IsString()
  @IsOptional()
  country?: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CContactChannel)
  contactChannels!: CContactChannel[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CParameter)
  parameters!: Parameter[];
}

export class Classification {
  @IsString()
  category!: string;
  @IsString()
  type!: string;
}

export class RequiredClassificationDto {
  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  type!: string;
}

export class ClassificationLabelReferenceDto {
  @IsString()
  @MinLength(1)
  id!: string;
}

export class UpdateSupportErrandClassificationDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @TypeTransformer(() => RequiredClassificationDto)
  @JSONSchema({ $ref: '#/components/schemas/RequiredClassificationDto' })
  classification!: RequiredClassificationDto;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @TypeTransformer(() => ClassificationLabelReferenceDto)
  @JSONSchema({ type: 'array', items: { $ref: '#/components/schemas/ClassificationLabelReferenceDto' } })
  categoryLabels!: ClassificationLabelReferenceDto[];

  @IsString()
  @MinLength(1)
  documentKey!: string;

  @IsString()
  @Matches(/^"(0|[1-9]\d*)"$/u)
  documentETag!: string;
}

export class UpdateSupportErrandPhaseDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;

  @IsString()
  @MinLength(1)
  transitionId!: string;
}

export class CSuspension implements Suspension {
  @IsString()
  @IsOptional()
  suspendedFrom!: string;
  @IsString()
  @IsOptional()
  suspendedTo!: string;
}

export class UpdateSupportErrandStatusDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;

  @IsString()
  @MinLength(1)
  expectedStatus!: string;

  @IsString()
  @MinLength(1)
  status!: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @TypeTransformer(() => CSuspension)
  @JSONSchema({ $ref: '#/components/schemas/CSuspension' })
  suspension?: CSuspension;
}

export class AssignSupportErrandDto {
  @IsString()
  @MinLength(1)
  assignedUserId!: string;
}

export class CErrandAction implements ErrandAction {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  actionName?: string;
  @IsString()
  @IsOptional()
  executeAfter?: string;
  @IsString()
  @IsOptional()
  actionConfigId?: string;
  @IsString()
  @IsOptional()
  displayValue?: string;
}
export class CNotification implements Notification {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  created?: string;
  @IsString()
  @IsOptional()
  modified?: string;
  @IsString()
  @IsOptional()
  ownerFullName?: string;
  @IsString()
  ownerId!: string;
  @IsString()
  @IsOptional()
  createdBy?: string;
  @IsString()
  @IsOptional()
  createdByFullName?: string;
  @IsString()
  type!: string;
  @IsString()
  description!: string;
  @IsString()
  @IsOptional()
  content?: string;
  @IsString()
  @IsOptional()
  expires?: string;
  @IsBoolean()
  @IsOptional()
  globalAcknowledged?: boolean;
  @IsBoolean()
  @IsOptional()
  acknowledged?: boolean;
  @IsString()
  @IsOptional()
  errandId?: string;
  @IsString()
  @IsOptional()
  errandNumber?: string;
}
export class CErrandPhase implements ErrandPhase {
  @IsString()
  @IsOptional()
  phaseId?: string;
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  @IsOptional()
  displayName?: string;
  @IsString()
  @IsOptional()
  started?: string;
  @IsString()
  @IsOptional()
  ended?: string;
}
export class SupportErrandDto implements Partial<SupportErrand> {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  errandNumber?: string;
  @IsString()
  @IsOptional()
  title?: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CSupportStakeholder)
  stakeholders!: CSupportStakeholder[];
  @IsString()
  @IsOptional()
  priority?: SupportPriority;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CExternalTag)
  externalTags!: ExternalTag[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CParameter)
  parameters!: Parameter[];
  // jsonParameters is intentionally absent: investigation documents are written only through the
  // per-key endpoints in SupportErrandJsonParameterController, which enforce If-Match versioning.
  @TypeTransformer(() => Classification)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  classification?: Classification;
  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  resolution?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  channel?: string;
  @IsString()
  @IsOptional()
  reporterUserId?: string;
  @IsString()
  @IsOptional()
  assignedUserId?: string;
  @IsString()
  @IsOptional()
  assignedGroupId?: string;
  @IsOptional()
  @IsString()
  escalationEmail?: string;
  @IsOptional()
  @IsString()
  contactReason?: string;
  @IsOptional()
  @IsString()
  contactReasonDescription?: string;
  @TypeTransformer(() => CSuspension)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  suspension?: CSuspension;
  @IsOptional()
  @IsBoolean()
  businessRelated?: boolean;
  @IsOptional()
  @IsArray()
  labels?: Label[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CNotification)
  activeNotifications?: CNotification[];
  @IsOptional()
  @IsString()
  created?: string;
  @IsOptional()
  @IsString()
  modified?: string;
  @IsOptional()
  @IsString()
  touched?: string;
  // Optimistic locking version, set by SupportManagement. Accepted here because the frontend echoes
  // fetched errands back, but stripped before we forward (SupportManagement rejects it on update).
  @IsNumber()
  @IsOptional()
  version?: number;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CErrandAction)
  actions?: CErrandAction[];
  @IsString()
  @IsOptional()
  activePhaseId?: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CErrandPhase)
  phases?: CErrandPhase[];
}

class ForwardFormDto {
  @IsString()
  recipient!: string;
  @IsArray()
  emails!: { value: string }[];
  @IsString()
  department!: string;
  @IsString()
  message!: string;
  @IsString()
  messageBodyPlaintext!: string;
}

@Controller()
@UseBefore(hasPermissions(['canEditSupportManagement']))
export class SupportErrandController {
  private apiService = new ApiService();
  private organizationService = new OrganizationService();
  private investigationPolicyService = new SupportInvestigationPolicyService();
  private jsonParameterService = new SupportJsonParameterService({ namespace: SUPPORTMANAGEMENT_NAMESPACE ?? '' });
  private newErrandDefaults: NewErrandDefaults | undefined = getNewErrandDefaults(APPLICATION);
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = apiServiceName('supportmanagement');
  CITIZEN_SERVICE = apiServiceName('citizen');

  /**
   * Resolves a free-text query that looks like an organization or personal number into a party id,
   * so that errands can also be matched on `stakeholders.externalId`. Returns '' when the query is
   * not an identifier or the lookup fails - a failed lookup must not fail the search itself.
   */
  private async resolveQueryPartyId(req: RequestWithUser, queryRaw?: string): Promise<string> {
    if (!queryRaw) return '';
    const normalizedIdentifier = queryRaw.replace(/\D/g, '');
    if (normalizedIdentifier.length === 10 && luhnCheck(normalizedIdentifier) && Number(normalizedIdentifier[2]) > 1) {
      return this.organizationService.getPartyIdByOrganizationNumber(MUNICIPALITY_ID!, normalizedIdentifier, req.user).catch(() => '');
    }
    if ((normalizedIdentifier.length === 10 || normalizedIdentifier.length === 12) && luhnCheck(normalizedIdentifier)) {
      const guidUrl = `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${normalizedIdentifier}/guid`;
      return this.apiService
        .get<string>({ url: guidUrl }, req.user)
        .then(response => response.data)
        .catch(() => '');
    }
    return '';
  }

  private async buildFilterForRequest(req: RequestWithUser, municipalityId: string, input: ErrandFilterInput): Promise<string> {
    const partyId = await this.resolveQueryPartyId(req, input.query);
    const errandFilter = buildErrandFilter({ ...input, partyId });
    if (!input.labelFilter) return errandFilter;

    let selections: unknown;
    try {
      selections = JSON.parse(input.labelFilter);
    } catch {
      throw new HttpException(400, 'Support Management labelFilter must be a valid JSON array');
    }

    const labelFilterProfile = this.investigationPolicyService.labelFilter;
    if (!labelFilterProfile) {
      throw new HttpException(400, 'Support Management label filtering is not configured for this application');
    }

    try {
      const metadataUrl = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata/labels`;
      const metadata = await this.apiService.get<SupportLabels>({ url: metadataUrl, propagateClientError: true }, req.user);
      const labelFilter = new SupportManagementLabelFilterService(labelFilterProfile, metadata.data).buildFilter(
        selections as readonly SupportManagementLabelFilterSelection[],
      );
      const clauses = [errandFilter, labelFilter].filter(Boolean).map(fragment => fragment.replace(/^&filter=/u, ''));
      if (clauses.length === 0) return '';
      const groupedClauses = clauses.map(clause => `(${clause})`).join(' and ');
      return `&filter=${groupedClauses}`;
    } catch (error) {
      if (error instanceof SupportManagementLabelFilterError) {
        throw new HttpException(getLabelFilterErrorStatus(error), error.message);
      }
      throw error;
    }
  }

  /**
   * Resolves the organization number for a COMPANY stakeholder when forwarding an errand.
   * Prefers the organization number persisted as a stakeholder parameter (written on save), falls
   * back to a Legal Entity lookup by partyId, and degrades gracefully on failure instead of
   * aborting the whole forward (e.g. for not-yet-migrated legacy organizations).
   */
  private async resolveStakeholderOrgNumber(s: SupportStakeholder, municipalityId: string, req: RequestWithUser): Promise<string | undefined> {
    const organizationNumberFromParameter = s.parameters?.find(p => p.key === 'organizationNumber')?.values?.[0] ?? '';
    let organizationNumberSource = organizationNumberFromParameter;
    if (!organizationNumberSource && s.externalId) {
      organizationNumberSource = await this.organizationService.getOrganizationNumberByPartyId(municipalityId, s.externalId, req.user).catch(e => {
        logger.error(`Error fetching organization number for partyId ${s.externalId}: `, e);
        return '';
      });
    }
    return formatOrgNr(organizationNumberSource, OrgNumberFormat.DASH);
  }

  /** A citizen party id can be resolved to a personal number only for these stakeholder types. */
  private hasResolvablePersonNumber(s: SupportStakeholder): boolean {
    return !!s.externalId && (s.externalIdType === ExternalIdType.PRIVATE || s.externalIdType === ExternalIdType.EMPLOYEE);
  }

  /**
   * Enriches an errand's stakeholders with their personal numbers, resolved from the citizen service.
   * Returns new objects - neither the errand nor its stakeholders are mutated. A failed lookup leaves
   * the stakeholder without a personNumber rather than failing the whole response.
   */
  preparedErrandResponse = async (errandData: SupportErrand, req: any) => {
    const visibleErrand = this.investigationPolicyService.filterProtectedJsonParameters(errandData, req.user);
    const stakeholders = visibleErrand.stakeholders;
    if (!stakeholders?.length) {
      return { data: visibleErrand, message: 'success' };
    }

    const personNumberOf = (s: SupportStakeholder) =>
      this.apiService.get<string>({ url: `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${s.externalId}/personnumber` }, req.user);

    // The first PRIMARY stakeholder is the customer; every non-PRIMARY one is a contact. Any further
    // PRIMARY stakeholders are neither, and are passed through untouched.
    const customerIndex = stakeholders.findIndex(s => s.role === SupportStakeholderRole.PRIMARY);

    const enriched = await Promise.all(
      stakeholders.map(async (s, i): Promise<SupportStakeholder & { personNumber?: string }> => {
        const isCustomer = i === customerIndex;
        const isContact = s.role !== SupportStakeholderRole.PRIMARY;
        if ((!isCustomer && !isContact) || !this.hasResolvablePersonNumber(s)) {
          return s;
        }
        if (isCustomer) {
          // NOTE the asymmetry with the contact branch below: the customer's personNumber is
          // stringified, a contact's is passed through as the citizen service returned it (a
          // number). Pre-existing behaviour the frontend relies on - do not "tidy" without checking.
          const res = await personNumberOf(s)
            .then(r => ({ data: `${r.data}` }))
            .catch(_e => ({ data: undefined }));
          return res.data === undefined ? s : { ...s, personNumber: res.data };
        }
        // Contacts are retried, since a whole page of them is resolved at once.
        const res = await withRetries(3, () => personNumberOf(s).catch(_e => ({ data: undefined, message: '404' })));
        const personNumber = typeof res === 'object' && res !== null ? (res as { data?: string }).data : undefined;
        return personNumber === undefined ? s : { ...s, personNumber };
      }),
    );

    return { data: { ...visibleErrand, stakeholders: enriched }, message: 'success' };
  };

  @Get('/supporterrands/errandnumber/:errandNumber')
  @OpenAPI({ summary: 'Return an errand by number' })
  @UseBefore(authMiddleware)
  async getSupportErrandByErrandNumber(
    @Req() req: RequestWithUser,
    @Param('errandNumber') errandNumber: string,
    @Res() response: any,
  ): Promise<SupportErrand> {
    if (!MUNICIPALITY_ID) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${this.SERVICE}/${MUNICIPALITY_ID}/${this.namespace}/errands?filter=errandNumber:'${errandNumber}'`;
    const errandResponse = await this.apiService.get<any>({ url }, req.user);
    const errandData = errandResponse.data.content[0];
    return response.send((await this.preparedErrandResponse(errandData, req)).data);
  }

  @Get('/supporterrands/:municipalityId/:id')
  @OpenAPI({ summary: 'Return an errand by id' })
  @UseBefore(authMiddleware)
  async errand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SupportErrand> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}`;
    const errandResponse = await this.apiService.get<SupportErrand>({ url }, req.user);
    const errandData = errandResponse.data;

    return response.send((await this.preparedErrandResponse(errandData, req)).data);
  }

  @Get('/supporterrands/:municipalityId')
  @OpenAPI({ summary: 'Return all support errands for municipality' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async errands(
    @Req() req: RequestWithUser,
    @QueryParam('page') page: number,
    @QueryParam('size') size: number,
    @QueryParam('query') query: string,
    @QueryParam('stakeholders') stakeholders: string,
    @QueryParam('priority') priority: string,
    @QueryParam('category') category: string,
    @QueryParam('type') type: string,
    @QueryParam('labelCategory') labelCategory: string,
    @QueryParam('labelType') labelType: string,
    @QueryParam('labelSubType') labelSubType: string,
    @QueryParam('labelFilter') labelFilter: string,
    @QueryParam('channel') channel: string,
    @QueryParam('status') status: string,
    @QueryParam('resolution') resolution: string,
    @QueryParam('start') start: string,
    @QueryParam('end') end: string,
    @QueryParam('sort') sort: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<PageErrand> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }

    const filter = await this.buildFilterForRequest(req, municipalityId, {
      query,
      stakeholders,
      priority,
      category,
      type,
      labelCategory,
      labelType,
      labelSubType,
      labelFilter,
      channel,
      status,
      resolution,
      start,
      end,
    });
    const queryParams = new URLSearchParams({ page: String(page || 0), size: String(size || 8) });
    const filterExpression = filter.replace(/^&filter=/u, '');
    if (filterExpression) queryParams.set('filter', filterExpression);
    if (sort) queryParams.set('sort', sort);
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands?${queryParams.toString()}`;
    const res = await this.apiService.get<PageErrand>({ url }, req.user);
    const data = {
      ...res.data,
      content: res.data.content?.map(errand => this.investigationPolicyService.filterProtectedJsonParameters(errand, req.user)),
    };
    return response.status(200).send(data);
  }

  @Get('/countsupporterrands/:municipalityId')
  @OpenAPI({ summary: 'Counts errands based on the provided filters' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async countErrands(
    @Req() req: RequestWithUser,
    @QueryParam('query') query: string,
    @QueryParam('stakeholders') stakeholders: string,
    @QueryParam('priority') priority: string,
    @QueryParam('category') category: string,
    @QueryParam('type') type: string,
    @QueryParam('labelCategory') labelCategory: string,
    @QueryParam('labelType') labelType: string,
    @QueryParam('labelSubType') labelSubType: string,
    @QueryParam('labelFilter') labelFilter: string,
    @QueryParam('channel') channel: string,
    @QueryParam('status') status: string,
    @QueryParam('resolution') resolution: string,
    @QueryParam('start') start: string,
    @QueryParam('end') end: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }

    const filter = await this.buildFilterForRequest(req, municipalityId, {
      query,
      stakeholders,
      priority,
      category,
      type,
      labelCategory,
      labelType,
      labelSubType,
      labelFilter,
      channel,
      status,
      resolution,
      start,
      end,
    });
    const queryParams = new URLSearchParams();
    const filterExpression = filter.replace(/^&filter=/u, '');
    if (filterExpression) queryParams.set('filter', filterExpression);
    const queryString = queryParams.toString();
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/count${queryString ? `?${queryString}` : ''}`;
    const res = await this.apiService.get<PageErrand>({ url }, req.user);
    const data = res.data;
    return response.status(200).send(data);
  }

  @Post('/newerrand/:municipalityId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Initiate a new, empty support errand' })
  @UseBefore(authMiddleware)
  async registerSupportErrand(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<{ data: SupportErrandDto; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }

    const registrationState = await this.investigationPolicyService.getRegistrationState(req.user);
    if (registrationState === 'unavailable') {
      throw new HttpException(503, 'Support errand registration policy is temporarily unavailable');
    }
    if (registrationState === 'disabled' || !this.newErrandDefaults) {
      throw new HttpException(409, 'Registration is not configured for this application');
    }

    // Fetch metadata for labels for new errand
    const metadataUrl = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata/labels`;
    const metadataRes = await this.apiService.get<{ labelStructure: Label[] }>({ url: metadataUrl }, req.user);

    const url = `${municipalityId}/${this.namespace}/errands`;
    const baseURL = apiURL(this.SERVICE);
    const body: Partial<SupportErrandDto> = {
      reporterUserId: req.user.username,
      assignedUserId: req.user.username,
      ...(this.newErrandDefaults.classification ? { classification: this.newErrandDefaults.classification } : {}),
      labels: this.newErrandDefaults.labels ? resolveDefaultLabels(metadataRes.data.labelStructure, this.newErrandDefaults.labels) : [],
      ...(this.newErrandDefaults.parameters ? { parameters: this.newErrandDefaults.parameters.map(parameter => ({ ...parameter })) } : {}),
      priority: SupportPriority.MEDIUM,
      status: Status.NEW,
      channel: ContactChannelType.PHONE,
      title: 'Empty errand',
    };
    const res = await this.apiService.post<any, Partial<SupportErrandDto>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when initiating support errand');
      logger.error(e);
      throw e;
    });
    if (!res.data || res.data === '') {
      console.error('Something went wrong when initiating support errand');
      logger.error('Something went wrong when initiating support errand');
      return response.status(500).send('Something went wrong when initiating support errand');
    }
    return response.status(201).send(res.data);
  }

  private async assertGenericClassificationUpdateAllowed(
    req: RequestWithUser,
    currentErrand: SupportErrand,
    data: Partial<SupportErrandDto>,
  ): Promise<void> {
    const classificationFieldsRequested = data.classification !== undefined || data.labels !== undefined;
    const policy = this.investigationPolicyService.iafVofClassificationPolicy;
    if (!classificationFieldsRequested && (data.parameters === undefined || !policy)) return;

    const owner = await this.investigationPolicyService.getClassificationOwner(req.user);
    if (owner === 'unavailable') {
      throw new HttpException(503, 'Investigation classification ownership is temporarily unavailable');
    }
    if (owner !== 'investigation') return;
    if (classificationFieldsRequested) {
      throw new HttpException(409, 'Use the investigation classification endpoint to update classification and labels');
    }
    if (policy && !preservesIafVofInvestigationClassificationOwnerParameter(currentErrand.parameters, data.parameters)) {
      throw new HttpException(409, 'The investigation classification owner parameter cannot be changed through the generic errand endpoint');
    }
  }

  @Patch('/supporterrands/:municipalityId/:id')
  @OpenAPI({ summary: 'Update a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(SupportErrandDto, 'body'))
  async updateSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @HeaderParam('If-Match') ifMatch: string | undefined,
    @Body() data: Partial<SupportErrandDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to fetch errands.');
      logger.error('No municipality id found, it is needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    assertGenericUpdateFields(data);
    const requestedVersion = requireStrongErrandVersion(ifMatch);
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const currentErrand = await this.apiService.get<SupportErrand>(
      { url, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    assertRequestedErrandVersion(requestedVersion, currentVersion);
    assertSupportErrandWritable(currentErrand.data, 'generic changes');

    await this.assertGenericClassificationUpdateAllowed(req, currentErrand.data, data);
    const body: Partial<SupportErrandDto> = stripErrandVersions({ ...data });
    const res = await this.apiService
      .patch<any, Partial<SupportErrandDto>>(
        {
          url,
          baseURL,
          data: body,
          headers: { 'If-Match': `"${currentVersion}"` },
          followLocation: false,
          propagateClientError: true,
        },
        req.user,
      )
      .catch(e => {
        logger.error('Error when registering support errand');
        logger.error(e);
        throw e;
      });
    return response.status(200).send(this.investigationPolicyService.filterProtectedJsonParameters(res.data, req.user));
  }

  @Patch('/supporterrands/:municipalityId/:id/status')
  @HttpCode(200)
  @OpenAPI({ summary: 'Apply one explicit status transition to a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportErrandStatusDto, 'body'))
  async updateSupportErrandStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: UpdateSupportErrandStatusDto,
    @Res() response: any,
  ): Promise<any> {
    if (!municipalityId) {
      logger.error('No municipality id found, it is needed to update the errand status.');
      return response.status(400).send('Municipality id missing');
    }

    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const metadataUrl = `${municipalityId}/${this.namespace}/metadata`;
    const baseURL = apiURL(this.SERVICE);
    const [currentErrand, metadata] = await Promise.all([
      this.apiService.get<SupportErrand>({ url, baseURL, includeResponseHeaders: true, propagateClientError: true }, req.user),
      this.apiService.get<SupportMetadata>({ url: metadataUrl, baseURL, propagateClientError: true }, req.user),
    ]);
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    if (currentVersion !== data.expectedVersion) {
      throw new HttpException(409, 'Support errand status has changed since it was loaded');
    }

    const body = resolveSupportErrandStatusTransition(currentErrand.data, metadata.data.statuses, data);
    await this.apiService.patch<SupportErrand, typeof body>(
      {
        url,
        baseURL,
        data: body,
        headers: { 'If-Match': `"${currentVersion}"` },
        followLocation: false,
        propagateClientError: true,
      },
      req.user,
    );

    const savedErrand = await this.apiService.get<SupportErrand>(
      { url, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    return response.status(200).send(
      this.investigationPolicyService.filterProtectedJsonParameters(
        {
          ...savedErrand.data,
          version: getErrandVersion(savedErrand.data, savedErrand.headers?.etag),
        },
        req.user,
      ),
    );
  }

  @Patch('/supporterrands/:municipalityId/:id/phase')
  @HttpCode(200)
  @OpenAPI({ summary: 'Apply one explicit workflow transition to a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportErrandPhaseDto, 'body'))
  async updateSupportErrandPhase(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: UpdateSupportErrandPhaseDto,
    @Res() response: any,
  ): Promise<any> {
    if (!municipalityId) {
      logger.error('No municipality id found, it is needed to update the errand phase.');
      return response.status(400).send('Municipality id missing');
    }

    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const metadataUrl = `${municipalityId}/${this.namespace}/metadata`;
    const baseURL = apiURL(this.SERVICE);
    const [currentErrand, metadata] = await Promise.all([
      this.apiService.get<SupportErrand>({ url, baseURL, includeResponseHeaders: true, propagateClientError: true }, req.user),
      this.apiService.get<SupportMetadata>({ url: metadataUrl, baseURL, propagateClientError: true }, req.user),
    ]);
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    if (currentVersion !== data.expectedVersion) {
      throw new HttpException(409, 'Support errand phase has changed since it was loaded');
    }

    const transition = resolveSupportErrandPhaseTransition(currentErrand.data, metadata.data.phases, data.transitionId);
    await this.apiService.patch<SupportErrand, Pick<SupportErrandDto, 'activePhaseId'>>(
      {
        url,
        baseURL,
        data: { activePhaseId: transition.targetPhaseId },
        headers: { 'If-Match': `"${currentVersion}"` },
        followLocation: false,
        propagateClientError: true,
      },
      req.user,
    );

    const savedErrand = await this.apiService.get<SupportErrand>(
      { url, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    return response.status(200).send(
      this.investigationPolicyService.filterProtectedJsonParameters(
        {
          ...savedErrand.data,
          version: getErrandVersion(savedErrand.data, savedErrand.headers?.etag),
        },
        req.user,
      ),
    );
  }

  @Patch('/supporterrands/:municipalityId/:id/classification')
  @HttpCode(200)
  @OpenAPI({ summary: 'Update the classification and labels of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportErrandClassificationDto, 'body'))
  async updateSupportErrandClassification(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: UpdateSupportErrandClassificationDto,
    @Res() response: any,
  ): Promise<any> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to update errand classification.');
      logger.error('No municipality id found, it is needed to update errand classification.');
      return response.status(400).send('Municipality id missing');
    }
    const classificationOwner = await this.investigationPolicyService.getClassificationOwner(req.user);
    if (classificationOwner === 'unavailable') {
      throw new HttpException(503, 'Investigation classification ownership is temporarily unavailable');
    }
    if (classificationOwner !== 'investigation') {
      throw new HttpException(409, 'Investigation does not own classification for this application');
    }
    const iafVofClassificationPolicy = this.investigationPolicyService.iafVofClassificationPolicy;
    if (!iafVofClassificationPolicy) {
      throw new HttpException(409, 'Investigation classification policy is unavailable');
    }
    const definition = this.investigationPolicyService.profile.documents.find(document => document.key === data.documentKey);
    if (!definition) {
      throw new HttpException(400, 'Unsupported investigation classification document');
    }
    this.investigationPolicyService.assertCanWriteDocument(req.user, definition.key);
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const metadataUrl = `${municipalityId}/${this.namespace}/metadata/labels`;
    const baseURL = apiURL(this.SERVICE);
    const [currentErrand, labelMetadata, classificationDocument] = await Promise.all([
      this.apiService.get<SupportErrand>({ url, baseURL, includeResponseHeaders: true, propagateClientError: true }, req.user),
      this.apiService.get<SupportLabels | null>({ url: metadataUrl, baseURL, propagateClientError: true }, req.user),
      this.jsonParameterService.readJsonParameter({
        definition,
        municipalityId,
        errandId: id,
        user: req.user,
      }),
    ]);
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    if (currentVersion !== data.expectedVersion) {
      throw new HttpException(409, 'Support errand classification has changed since it was loaded');
    }
    assertSupportErrandWritable(currentErrand.data, 'investigation classification changes');
    if (classificationDocument.etag !== data.documentETag) {
      throw new HttpException(409, 'Investigation document has changed since classification was edited');
    }
    const classificationOwnerSelection = resolveIafVofInvestigationClassificationOwner(iafVofClassificationPolicy, currentErrand.data);
    assertSupportInvestigationClassificationContext(
      iafVofClassificationPolicy,
      classificationOwnerSelection,
      definition.key,
      classificationDocument.document.value,
      data.classification,
    );
    const resolvedClassification = resolveSupportErrandClassification(data, labelMetadata.data?.labelStructure, iafVofClassificationPolicy.labelTree);
    const body = buildSupportErrandClassificationUpdateBody(
      data,
      currentErrand.data.labels,
      resolvedClassification.categoryLabels,
      resolvedClassification.classification,
      resolvedClassification.managedCategoryLabelIds,
      resolvedClassification.managedRootResource,
    );
    await this.apiService.patch<SupportErrand, typeof body>(
      { url, baseURL, data: body, headers: { 'If-Match': `"${data.expectedVersion}"` }, propagateClientError: true },
      req.user,
    );
    const savedErrand = await this.apiService.get<SupportErrand>(
      { url, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    const savedVersion = getErrandVersion(savedErrand.data, savedErrand.headers?.etag);

    return response
      .status(200)
      .send(this.investigationPolicyService.filterProtectedJsonParameters({ ...savedErrand.data, version: savedVersion }, req.user));
  }

  @Patch('/supporterrands/:municipalityId/:id/admin')
  @OpenAPI({ summary: 'Set user as admin for support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(AssignSupportErrandDto, 'body'))
  async becomeAdminForSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @HeaderParam('If-Match') ifMatch: string | undefined,
    @Body() data: AssignSupportErrandDto,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to update errand.');
      logger.error('No municipality id found, it is needed to update errand.');
      return response.status(400).send('Municipality id missing');
    }
    const requestedVersion = requireStrongErrandVersion(ifMatch);
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const currentErrand = await this.apiService.get<SupportErrand>(
      { url, baseURL, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    assertRequestedErrandVersion(requestedVersion, currentVersion);
    assertSupportErrandAdminAssignable(currentErrand.data, 'administrator changes');

    const body: AssignSupportErrandDto = { assignedUserId: data.assignedUserId };
    const res = await this.apiService
      .patch<any, AssignSupportErrandDto>(
        {
          url,
          baseURL,
          data: body,
          headers: { 'If-Match': `"${currentVersion}"` },
          followLocation: false,
          propagateClientError: true,
        },
        req.user,
      )
      .catch(e => {
        logger.error('Error when setting administrator for support errand');
        logger.error(e);
        throw e;
      });
    return response.status(200).send(this.investigationPolicyService.filterProtectedJsonParameters(res.data, req.user));
  }

  @Post('/supporterrands/:municipalityId/:id/forward')
  @OpenAPI({ summary: 'Forward a support errand' })
  @UseBefore(authMiddleware, validationMiddleware(ForwardFormDto, 'body'))
  async forwardSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<ForwardFormDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to forward errand.');
      logger.error('No municipality id found, it is needed to forward errand.');
      return response.status(400).send('Municipality id missing');
    }
    if (!id) {
      console.error('No errand id found, it is needed to forward errand.');
      logger.error('No errand id found, it is needed to forward errand.');
      return response.status(400).send('Errand id missing');
    }
    const supportErrandUrl = `${municipalityId}/${this.namespace}/errands/${id}`;
    const supportBaseURL = apiURL(this.SERVICE);
    // A missing errand surfaces as a thrown HttpException(404) from ApiService, not a falsy result.
    const existingSupportErrand = await this.apiService.get<SupportErrand>({ url: supportErrandUrl, baseURL: supportBaseURL }, req.user);

    const stakeholders: CasedataStakeholderDTO[] = [];
    for (const s of existingSupportErrand.data.stakeholders ?? []) {
      if (!s.firstName && !s.organizationName) {
        console.error('Missing required fields for stakeholder');
        logger.error('Missing required fields for stakeholder');
        return response.status(400).send('Missing required fields for stakeholder');
      }
      // TODO Check for email and phone?
      // if (
      //   s.contactChannels.length === 0 ||
      //   !s.contactChannels.some(c => c.type === ContactChannelType.PHONE) ||
      //   !s.contactChannels.some(c => c.type === ContactChannelType.EMAIL)
      // ) {
      //   console.error('Missing required contact channels for stakeholder');
      //   logger.error('Missing required contact channels for stakeholder');
      //   return response.status(400).send('Missing required contact channels for stakeholder');
      // }
      const organizationNumber =
        s.externalIdType === ExternalIdType.COMPANY ? await this.resolveStakeholderOrgNumber(s, municipalityId, req) : undefined;
      stakeholders.push(toCasedataStakeholder(s, organizationNumber));
    }

    const caseDataErrand: Partial<CasedataErrandDTO> = {
      caseType: MEXCaseType.MEX_FORWARDED_FROM_CONTACTSUNDSVALL as any,
      priority: existingSupportErrand.data.priority as unknown as CasedataErrandDtoPriorityEnum,
      channel: toCasedataChannel(existingSupportErrand.data.channel),
      stakeholders: stakeholders,
      // TODO How to map facilities? How are property designations stored in SupportManagement?
      facilities: toFacilities(existingSupportErrand.data.parameters),
      statuses: [
        {
          statusType: ErrandStatus.ArendeInkommit,
          description: ErrandStatus.ArendeInkommit,
        },
      ],
      extraParameters: [{ key: 'supportManagementErrandNumber', values: [existingSupportErrand.data.errandNumber!] }],
    };
    logger.info('Creating new errand in CaseData', caseDataErrand);
    const referredFrom = `REFERRED_FROM|${id};case;supportmanagement;${this.namespace}|`;
    const url = `${municipalityId}/${data.department}/errands`;
    const CASEDATA_SERVICE = apiServiceName('case-data');
    const baseURL = apiURL(CASEDATA_SERVICE);
    const errand: CasedataErrandDTO = await this.apiService
      .post<CasedataErrandDTO, Partial<CasedataErrandDTO>>({ url, baseURL, data: caseDataErrand, params: { referredFrom } }, req.user)
      .then(errandResponse => {
        return errandResponse.data;
      })
      .catch(e => {
        logger.error('Error when creating errand');
        logger.error(e);
        throw e;
      });

    // Fetch support errand attachments
    try {
      const supportErrandAttachmentsUrl = `${municipalityId}/${this.namespace}/errands/${id}/attachments`;
      const existingSupportErrandAttachments = await this.apiService.get<ErrandAttachment[]>(
        { url: supportErrandAttachmentsUrl, baseURL: supportBaseURL },
        req.user,
      );
      const attachmentsPromises: Promise<ErrandAttachment & { fileData: ArrayBuffer }>[] = existingSupportErrandAttachments.data?.map(a => {
        const singleAttachmentsUrl = `${municipalityId}/${this.namespace}/errands/${id}/attachments/${a.id}`;
        const filesData = this.apiService
          .get<ArrayBuffer>({ url: singleAttachmentsUrl, baseURL: supportBaseURL, responseType: 'arraybuffer' }, req.user)
          .then(res => ({
            fileData: res.data,
            ...a,
          }));
        return filesData;
      });

      const attachments = await Promise.all(attachmentsPromises);
      const attachmentDtos: FormData[] = attachments?.map(attachmentData =>
        toAttachmentDto(attachmentData, attachmentData.fileData, errand.errandNumber!),
      );

      const postedAttachments: Promise<CasedataErrandDTO>[] = attachmentDtos?.map(attachmentFormData => {
        const casedataAttachmentsUrl = `${municipalityId}/${data.department}/errands/${errand.id}/attachments`;
        const casedataAttachmentsResponse = this.apiService
          .post<CasedataErrandDTO, FormData>(
            {
              url: casedataAttachmentsUrl,
              baseURL,
              data: attachmentFormData,
              headers: { 'Content-Type': attachmentFormData.getHeaders()['content-type'] },
            },
            req.user,
          )
          .then(res => res.data)
          .catch(e => {
            logger.error('Error when posting attachments for forwarded errand:', e);
            throw e;
          });
        return casedataAttachmentsResponse;
      });
      await Promise.all(postedAttachments).catch(e => {
        logger.error('Error when posting attachments for forwarded errand');
        throw e;
      });
    } catch (e) {
      logger.error('Error when copying attachments to forwarded errand:', e);
      return response.status(400).send('ATTACHMENTS_FAILED');
    }

    if (data?.messageBodyPlaintext?.trim()) {
      try {
        const relationsBaseURL = apiURL(apiServiceName('relations'));
        const relationsUrl = `${municipalityId}/relations?filter=target.resourceId%3A%27${errand.id}%27`;
        const relationsRes = await this.apiService.get<RelationPagedResponse>({ url: relationsUrl, baseURL: relationsBaseURL }, req.user);
        const referredFromRelation = relationsRes.data.relations?.find(r => r.type === 'REFERRED_FROM');

        if (referredFromRelation?.id) {
          const conversation = await createConversation(errand.id!.toString(), req.user, 'INTERNAL', 'Överlämning', data.department!, [
            referredFromRelation.id,
          ]);

          await sendConversationTextMessage(errand.id!.toString(), conversation.id, req.user, data.message ?? '', data.department!);
        }
      } catch (error) {
        logger.error('Error when creating conversation message for forwarded errand:', error);
      }
    }

    return response.status(200).send(errand);
  }
}
