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
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Response } from 'express';
import FormData from 'form-data';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { APPLICATION, MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
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
  buildErrandFilter,
  ErrandFilterInput,
  getNewErrandDefaults,
  resolveDefaultLabels,
  stripErrandVersions,
  SupportStakeholderRole,
  toAttachmentDto,
  toCasedataChannel,
  toCasedataStakeholder,
  toFacilities,
} from '@/services/support-errand.service';
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
  classification!: RequiredClassificationDto;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @TypeTransformer(() => ClassificationLabelReferenceDto)
  categoryLabels!: ClassificationLabelReferenceDto[];
}

interface SupportErrandClassificationBinding {
  owner?: Label;
  category: Label;
  types: Label[];
}

interface SupportErrandClassificationMetadata {
  bindings: SupportErrandClassificationBinding[];
  managedLabels: Label[];
}

const normalizeLabelClassification = (classification: string | undefined): string => (classification ?? '').trim().replace(/_/g, '-').toUpperCase();

const normalizeLabelResource = (resource: string | undefined): string =>
  (resource ?? '')
    .trim()
    .replace(/^\/+|\/+$/gu, '')
    .toUpperCase();

const isCategoryLabel = (label: NonNullable<SupportErrand['labels']>[number], managedCategoryLabelIds: ReadonlySet<string>): boolean => {
  const resourcePath = normalizeLabelResource(label.resourcePath);
  return (
    resourcePath === 'CATEGORY' || resourcePath.startsWith('CATEGORY/') || (typeof label.id === 'string' && managedCategoryLabelIds.has(label.id))
  );
};

const getLabelResource = (label: Label): string => label.resourcePath || label.resourceName;

const requireMetadataLabelResource = (label: Label): string => {
  if (typeof label.resourcePath === 'string' && label.resourcePath.trim().length > 0) return label.resourcePath;
  if (typeof label.resourceName === 'string' && label.resourceName.trim().length > 0) return label.resourceName;
  throw new HttpException(502, 'Support Management classification metadata contains a label without resource');
};

const findClassificationTypeLabels = (labels: readonly Label[] | undefined): Label[] => {
  const types: Label[] = [];

  const visit = (nodes: readonly Label[]) => {
    for (const node of nodes) {
      const classification = normalizeLabelClassification(node.classification);
      if (classification === 'TYPE') {
        types.push(node);
      } else if (classification !== 'CATEGORY' && node.labels?.length) {
        visit(node.labels);
      }
    }
  };

  visit(labels ?? []);
  return types;
};

const getSupportErrandClassificationMetadata = (labelStructure: readonly Label[]): SupportErrandClassificationMetadata => {
  const bindings: SupportErrandClassificationBinding[] = [];

  const visit = (nodes: readonly Label[], owner?: Label) => {
    for (const node of nodes) {
      const classification = normalizeLabelClassification(node.classification);
      const resource = normalizeLabelResource(getLabelResource(node));
      const categoryRoot = classification === 'CATEGORY-ROOT' || resource === 'CATEGORY';
      if (classification === 'CATEGORY' && !categoryRoot) {
        bindings.push({ owner, category: node, types: findClassificationTypeLabels(node.labels) });
        continue;
      }

      const nextOwner = classification === 'PROVISION-CATEGORY' ? node : owner;
      if (node.labels?.length) visit(node.labels, nextOwner);
    }
  };

  const categoryRoots = labelStructure.filter(label => {
    const classification = normalizeLabelClassification(label.classification);
    return classification === 'CATEGORY-ROOT' || normalizeLabelResource(getLabelResource(label)) === 'CATEGORY';
  });
  if (categoryRoots.length !== 1) {
    throw new HttpException(502, 'Support Management classification metadata must contain exactly one CATEGORY root');
  }
  const categoryRoot = categoryRoots[0];
  if (categoryRoot?.labels?.length) visit(categoryRoot.labels);
  if (bindings.length === 0) {
    throw new HttpException(502, 'Support Management classification metadata contains no CATEGORY labels');
  }
  const managedLabels: Label[] = [];
  const collectManagedLabels = (labels: readonly Label[]) => {
    for (const label of labels) {
      managedLabels.push(label);
      if (label.labels?.length) collectManagedLabels(label.labels);
    }
  };
  collectManagedLabels([categoryRoot]);

  return { bindings, managedLabels };
};

const requireMetadataLabelId = (label: Label): string => {
  if (typeof label.id === 'string' && label.id.length > 0) return label.id;
  throw new HttpException(502, 'Support Management classification metadata contains a label without id');
};

interface ResolvedSupportErrandClassification {
  classification: RequiredClassificationDto;
  categoryLabels: ClassificationLabelReferenceDto[];
  managedCategoryLabelIds: string[];
}

type SupportErrandClassificationSelection = Pick<UpdateSupportErrandClassificationDto, 'classification' | 'categoryLabels'>;

export const resolveSupportErrandClassification = (
  data: SupportErrandClassificationSelection,
  labelStructure: readonly Label[] | undefined,
): ResolvedSupportErrandClassification => {
  if (!labelStructure?.length) {
    throw new HttpException(502, 'Support Management classification metadata is unavailable');
  }

  const { bindings, managedLabels } = getSupportErrandClassificationMetadata(labelStructure);
  const metadataIds = new Map<string, Label>();
  for (const label of managedLabels) {
    const id = requireMetadataLabelId(label);
    if (metadataIds.has(id)) {
      throw new HttpException(502, 'Support Management classification metadata contains duplicate label ids');
    }
    metadataIds.set(id, label);
  }

  for (const binding of bindings) {
    for (const label of [...(binding.owner ? [binding.owner] : []), binding.category, ...binding.types]) {
      requireMetadataLabelResource(label);
    }
  }

  const matchingBindings = bindings.filter(binding => {
    const expectedCategory = binding.owner ? requireMetadataLabelResource(binding.owner) : requireMetadataLabelResource(binding.category);
    return (
      normalizeLabelResource(expectedCategory) === normalizeLabelResource(data.classification.category) &&
      normalizeLabelResource(requireMetadataLabelResource(binding.category)) === normalizeLabelResource(data.classification.type)
    );
  });
  if (matchingBindings.length === 0) {
    throw new HttpException(400, 'Classification does not match the Support Management CATEGORY tree');
  }
  if (matchingBindings.length > 1) {
    throw new HttpException(502, 'Support Management classification metadata contains an ambiguous CATEGORY path');
  }

  const binding = matchingBindings[0];
  const submittedIds = data.categoryLabels.map(label => label.id);
  const submittedIdSet = new Set(submittedIds);
  if (submittedIdSet.size !== submittedIds.length) {
    throw new HttpException(400, 'Classification label ids must be unique');
  }

  const ownerId = binding.owner ? requireMetadataLabelId(binding.owner) : undefined;
  const categoryId = requireMetadataLabelId(binding.category);
  const typeIds = binding.types.map(type => ({ id: requireMetadataLabelId(type), type }));
  const selectedTypes = typeIds.filter(({ id }) => submittedIdSet.has(id));
  if ((typeIds.length > 0 && selectedTypes.length !== 1) || (typeIds.length === 0 && selectedTypes.length !== 0)) {
    throw new HttpException(400, 'Classification must contain exactly one valid undercategory when required');
  }

  const expectedIds = [...(ownerId ? [ownerId] : []), categoryId, ...selectedTypes.map(({ id }) => id)];
  if (submittedIds.length !== expectedIds.length || submittedIds.some(id => !expectedIds.includes(id))) {
    throw new HttpException(400, 'Classification label ids do not match the selected CATEGORY path');
  }

  return {
    classification: {
      category: binding.owner ? requireMetadataLabelResource(binding.owner) : requireMetadataLabelResource(binding.category),
      type: requireMetadataLabelResource(binding.category),
    },
    categoryLabels: expectedIds.map(id => ({ id })),
    managedCategoryLabelIds: [...metadataIds.keys()],
  };
};

export const buildSupportErrandClassificationUpdateBody = (
  data: SupportErrandClassificationSelection,
  currentLabels: SupportErrand['labels'],
  categoryLabels: readonly ClassificationLabelReferenceDto[] = data.categoryLabels,
  classification: RequiredClassificationDto = data.classification,
  managedCategoryLabelIds: readonly string[] = categoryLabels.map(label => label.id),
): { classification: RequiredClassificationDto; labels: ClassificationLabelReferenceDto[] } => {
  const managedCategoryLabelIdSet = new Set(managedCategoryLabelIds);
  const preservedLabelIds = (currentLabels ?? [])
    .filter(label => !isCategoryLabel(label, managedCategoryLabelIdSet))
    .map(label => {
      if (typeof label.id !== 'string' || label.id.length === 0) {
        throw new HttpException(502, 'Support Management response contains an unrelated label without id');
      }

      return label.id;
    });
  const labelIds = [...preservedLabelIds, ...categoryLabels.map(label => label.id)];

  return {
    classification: {
      category: classification.category,
      type: classification.type,
    },
    labels: [...new Set(labelIds)].map(id => ({ id })),
  };
};

const STRONG_ERRAND_ETAG_PATTERN = /^"\d+"$/;

const getErrandVersion = (errand: SupportErrand, responseETag: unknown): number => {
  const responseVersion =
    typeof responseETag === 'string' && STRONG_ERRAND_ETAG_PATTERN.test(responseETag) ? Number(responseETag.slice(1, -1)) : undefined;
  const bodyVersion = typeof errand.version === 'number' && Number.isSafeInteger(errand.version) && errand.version >= 0 ? errand.version : undefined;

  if (responseVersion !== undefined && !Number.isSafeInteger(responseVersion)) {
    throw new HttpException(502, 'Support Management response contains an invalid errand ETag');
  }
  if (responseVersion !== undefined && bodyVersion !== undefined && responseVersion !== bodyVersion) {
    throw new HttpException(502, 'Support Management response contains inconsistent errand versions');
  }
  if (responseVersion !== undefined) {
    return responseVersion;
  }
  if (bodyVersion !== undefined) {
    return bodyVersion;
  }

  throw new HttpException(502, 'Support Management response is missing a valid errand version');
};

export class CSuspension implements Suspension {
  @IsString()
  @IsOptional()
  suspendedFrom!: string;
  @IsString()
  @IsOptional()
  suspendedTo!: string;
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

  private async buildFilterForRequest(req: RequestWithUser, input: ErrandFilterInput): Promise<string> {
    const partyId = await this.resolveQueryPartyId(req, input.query);
    return buildErrandFilter({ ...input, partyId });
  }

  /**
   * Resolves the organization number for a COMPANY stakeholder when forwarding an errand.
   * Prefers the organization number persisted as a stakeholder parameter (written on save), falls
   * back to a Legal Entity lookup by partyId, and degrades gracefully on failure instead of
   * aborting the whole forward (e.g. for not-yet-migrated legacy organizations).
   */
  private async resolveStakeholderOrgNumber(s: SupportStakeholder, municipalityId: string, req: RequestWithUser): Promise<string | undefined> {
    const organizationNumberFromParameter = s.parameters?.find(p => p.key === 'organizationNumber')?.values?.[0] ?? '';
    const organizationNumberSource =
      organizationNumberFromParameter ||
      (s.externalId
        ? await this.organizationService.getOrganizationNumberByPartyId(municipalityId, s.externalId, req.user).catch(e => {
            logger.error(`Error fetching organization number for partyId ${s.externalId}: `, e);
            return '';
          })
        : '');
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
    const stakeholders = errandData.stakeholders;
    if (!stakeholders?.length) {
      return { data: errandData, message: 'success' };
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

    return { data: { ...errandData, stakeholders: enriched }, message: 'success' };
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

    const filter = await this.buildFilterForRequest(req, {
      query,
      stakeholders,
      priority,
      category,
      type,
      labelCategory,
      labelType,
      labelSubType,
      channel,
      status,
      resolution,
      start,
      end,
    });
    let url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands?page=${page || 0}&size=${size || 8}`;
    url += filter;
    if (sort) {
      url += `&sort=${sort}`;
    }
    const res = await this.apiService.get<PageErrand>({ url }, req.user);
    const data = res.data;
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

    const filter = await this.buildFilterForRequest(req, {
      query,
      stakeholders,
      priority,
      category,
      type,
      labelCategory,
      labelType,
      labelSubType,
      channel,
      status,
      resolution,
      start,
      end,
    });
    // buildErrandFilter returns a fragment that starts with '&' so it can be appended to the paged
    // errands URL; here it is the only query parameter, so drop the separator.
    const queryString = filter.replace(/^&/, '');
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

    // Fetch metadata for labels for new errand
    const metadataUrl = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata/labels`;
    const metadataRes = await this.apiService.get<{ labelStructure: Label[] }>({ url: metadataUrl }, req.user);

    const url = `${municipalityId}/${this.namespace}/errands`;
    const baseURL = apiURL(this.SERVICE);
    const errandDefaults = getNewErrandDefaults(APPLICATION);
    const body: Partial<SupportErrandDto> = {
      reporterUserId: req.user.username,
      assignedUserId: req.user.username,
      classification: errandDefaults?.classification,
      labels: errandDefaults?.labels ? resolveDefaultLabels(metadataRes.data.labelStructure, errandDefaults.labels) : [],
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

  @Patch('/supporterrands/:municipalityId/:id')
  @OpenAPI({ summary: 'Update a support errand' })
  @UseBefore(authMiddleware, validationMiddleware(SupportErrandDto, 'body'))
  async updateSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<SupportErrandDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to fetch errands.');
      logger.error('No municipality id found, it is needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const body: Partial<SupportErrandDto> = stripErrandVersions({ ...data });
    const res = await this.apiService.patch<any, Partial<SupportErrandDto>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when registering support errand');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
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
    @Res() response: Response,
  ): Promise<Response> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to update errand classification.');
      logger.error('No municipality id found, it is needed to update errand classification.');
      return response.status(400).send('Municipality id missing');
    }

    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const metadataUrl = `${municipalityId}/${this.namespace}/metadata/labels`;
    const baseURL = apiURL(this.SERVICE);
    const [currentErrand, labelMetadata] = await Promise.all([
      this.apiService.get<SupportErrand>({ url, baseURL, includeResponseHeaders: true, propagateClientError: true }, req.user),
      this.apiService.get<SupportLabels | null>({ url: metadataUrl, baseURL, propagateClientError: true }, req.user),
    ]);
    const currentVersion = getErrandVersion(currentErrand.data, currentErrand.headers?.etag);
    if (currentVersion !== data.expectedVersion) {
      throw new HttpException(409, 'Support errand classification has changed since it was loaded');
    }
    const resolvedClassification = resolveSupportErrandClassification(data, labelMetadata.data?.labelStructure);
    const body = buildSupportErrandClassificationUpdateBody(
      data,
      currentErrand.data.labels,
      resolvedClassification.categoryLabels,
      resolvedClassification.classification,
      resolvedClassification.managedCategoryLabelIds,
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

    return response.status(200).send({ ...savedErrand.data, version: savedVersion });
  }

  @Patch('/supporterrands/:municipalityId/:id/admin')
  @OpenAPI({ summary: 'Set user as admin for support errand' })
  @UseBefore(authMiddleware, validationMiddleware(SupportErrandDto, 'body'))
  async becomeAdminForSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<SupportErrandDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to update errand.');
      logger.error('No municipality id found, it is needed to update errand.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const body: Partial<SupportErrandDto> = {
      assignedUserId: data.assignedUserId,
      status: data?.status,
    };
    const res = await this.apiService.patch<any, Partial<SupportErrandDto>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when setting administrator for support errand');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
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
