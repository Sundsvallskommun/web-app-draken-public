import dayjs from 'dayjs';
import FormData from 'form-data';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import type { IafVofInvestigationClassificationLabelTree } from '@/config/iaf-vof-investigation-classification';
import { normalizeSupportManagementResourcePath } from '@/config/supportmanagement-path';
import {
  AddressAddressCategoryEnum,
  AttachmentChannelEnum,
  ContactInformation,
  ContactInformationContactTypeEnum,
  ErrandChannelEnum as CasedataErrandDtoChannelEnum,
  Facility as FacilityDTO,
  Stakeholder as CasedataStakeholderDTO,
  StakeholderTypeEnum as CasedataStakeholderDtoTypeEnum,
} from '@/data-contracts/case-data/data-contracts';
import {
  ContactChannel,
  Errand,
  ErrandAttachment,
  Label,
  Parameter,
  Phase,
  Stakeholder as SupportStakeholder,
  Status as SupportManagementStatus,
  Suspension,
} from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { CreateAttachmentDto } from '@/interfaces/attachment.interface';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';
import { Role } from '@/interfaces/role';
import { ContactChannelType } from '@/interfaces/support-contactchannel';
import { SupportManagementChannels } from '@/interfaces/supportmanagement-channel.interface';
import { User } from '@/interfaces/users.interface';
import { logger } from '@/utils/logger';
import { apiURL, buildCategoryFilter, findLeafComponents, removeUnreachablePaths, toOffsetDateTime } from '@/utils/util';

import ApiService from './api.service';
const SERVICE = apiServiceName('supportmanagement');
const namespace = SUPPORTMANAGEMENT_NAMESPACE;

export const validateSupportAction: (municipalityId: string, errandId: string, user: User) => Promise<boolean> = async (
  municipalityId,
  errandId,
  user,
) => {
  let allowed = false;
  const apiService = new ApiService();
  const url = `${municipalityId}/${namespace}/errands/${errandId}`;
  const baseURL = apiURL(SERVICE);
  const res = await apiService.get<Errand>({ url, baseURL }, user);
  const existingErrand = res.data;
  if (user.username.toLocaleLowerCase() === existingErrand.assignedUserId?.toLocaleLowerCase()) {
    allowed = true;
  }
  if (existingErrand.assignedUserId?.toLocaleLowerCase() === undefined) {
    if (existingErrand.channel === 'EMAIL' || existingErrand.channel === 'ESERVICE') {
      allowed = true;
    }
  }
  return Promise.resolve(allowed);
};

export enum SupportStakeholderRole {
  PRIMARY = 'PRIMARY',
  CONTACT = 'CONTACT',
}

/**
 * Characters accepted in a free-text search query. Everything else is stripped before the
 * query is interpolated into the SupportManagement filter expression, so that a user cannot
 * break out of the quoted literal.
 */
export const SAFE_CHARS_REGEX = /[^\p{L}\p{N}\s.\-_,:]/gu;

export const sanitizeQuery = (s?: string): string => {
  return (s ?? '').normalize('NFKC').replace(SAFE_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
};

export interface ErrandFilterInput {
  /** Raw free-text query. Sanitized here; callers pass it through untouched. */
  query?: string;
  /** Party id already resolved from the query (org number or personal number), if any. */
  partyId?: string;
  stakeholders?: string;
  priority?: string;
  category?: string;
  type?: string;
  labelCategory?: string;
  labelType?: string;
  labelSubType?: string;
  /** JSON-encoded generic label selections; resolved by the controller against profile + live metadata. */
  labelFilter?: string;
  channel?: string;
  status?: string;
  resolution?: string;
  start?: string;
  end?: string;
}

/** Wraps a comma-separated parameter into an `or` group, e.g. `HIGH,LOW` -> `(priority:'HIGH' or priority:'LOW')`. */
const orGroup = (field: string, csv: string): string =>
  `(${csv
    .split(',')
    .map(s => `${field}:'${s}'`)
    .join(' or ')})`;

/**
 * Builds the `&filter=...` query-string fragment for the SupportManagement errands endpoints.
 * Pure: any party-id lookup must be performed by the caller and passed in via `partyId`.
 */
export const buildErrandFilter = (input: ErrandFilterInput): string => {
  const { query: queryRaw, partyId, stakeholders, priority, category, type, labelCategory, labelType, labelSubType } = input;
  const { channel, status, resolution, start, end } = input;
  const filterList: string[] = [];

  if (queryRaw) {
    // sanitizeQuery already drops '+' (it is outside SAFE_CHARS_REGEX), and the clauses below are
    // *contains* matches - so a query of '+46701740635' searches for '46701740635', which still
    // matches a stored '+46701740635'. No separate phone-number normalisation is needed.
    const query = sanitizeQuery(queryRaw);

    let queryFilter = '(';
    queryFilter += `description~'*${query}*'`;
    queryFilter += ` or title~'*${query}*'`;
    queryFilter += ` or errandNumber~'*${query}*'`;
    queryFilter += ` or exists(stakeholders.firstName~'*${query}*')`;
    queryFilter += ` or exists(stakeholders.lastName~'*${query}*')`;
    queryFilter += ` or exists(stakeholders.address~'*${query}*')`;
    queryFilter += ` or exists(stakeholders.zipCode~'*${query}*')`;
    queryFilter += ` or exists(stakeholders.contactChannels.value~'*${query}*' and stakeholders.contactChannels.type~'${ContactChannelType.EMAIL}')`;
    queryFilter += ` or exists(stakeholders.contactChannels.value~'*${query}*' and stakeholders.contactChannels.type~'${ContactChannelType.PHONE}')`;
    queryFilter += ` or exists(stakeholders.organizationName~'*${query}*')`;
    queryFilter += ` or exists(stakeholders.externalId~'*${query}*')`;
    queryFilter += ` or exists(parameters.values~'*${query}*')`;
    if (partyId) {
      queryFilter += ` or exists(stakeholders.externalId~'*${sanitizeQuery(partyId)}*')`;
    }
    queryFilter += ')';
    filterList.push(queryFilter);
  }

  if (stakeholders) {
    filterList.push(`(assignedUserId:'${stakeholders}' or (assignedUserId is null and reporterUserId:'${stakeholders}' ))`);
  }
  if (priority) {
    filterList.push(orGroup('priority', priority));
  }
  if (category) {
    filterList.push(orGroup('category', category));
  }
  if (type) {
    filterList.push(orGroup('type', type));
  }
  if (labelCategory || labelType || labelSubType) {
    const labelCategoryList = labelCategory?.split(',');
    const labelTypeList = labelType?.split(',');
    const labelSubTypeList = labelSubType?.split(',');

    const cleanPath = removeUnreachablePaths([labelCategoryList, labelTypeList, labelSubTypeList]);

    const leaves = findLeafComponents(cleanPath);

    const searchString = buildCategoryFilter([...leaves]);
    if (searchString) filterList.push(searchString);
  }
  if (channel) {
    filterList.push(`channel:'${channel}'`);
  }
  if (status) {
    filterList.push(orGroup('status', status));
  }
  if (resolution) {
    filterList.push(`resolution:'${resolution}'`);
  }
  if (start) {
    const s = toOffsetDateTime(dayjs(start).startOf('day'));
    filterList.push(`created>'${s}'`);
  }
  if (end) {
    const e = toOffsetDateTime(dayjs(end).endOf('day'));
    filterList.push(`created<'${e}'`);
  }

  return filterList.length > 0 ? `&filter=${filterList.join(' and ')}` : '';
};

export type LabelSpec = { category: string; type: string; subType?: string };

export interface NewErrandDefaults {
  classification?: { category: string; type: string };
  labels?: LabelSpec;
  parameters?: readonly Pick<Parameter, 'key' | 'displayName' | 'values'>[];
}

// Default classification and labels applied to a new empty errand, per application (drake).
// Applications without a `labels` entry get no default labels.
export const NEW_ERRAND_DEFAULTS: Record<string, NewErrandDefaults> = {
  KC: { classification: { category: 'CONTACT_SUNDSVALL', type: 'UNCATEGORIZED' } },
  KA: {
    classification: { category: 'ADMINISTRATION', type: 'ADMINISTRATION/CONTACT_CENTER' },
    labels: { category: 'ADMINISTRATION', type: 'ADMINISTRATION/CONTACT_CENTER', subType: 'ADMINISTRATION/CONTACT_CENTER/GENERAL' },
  },
  LOP: {
    classification: { category: 'SALARY', type: 'SALARY.UNCATEGORIZED' },
    labels: { category: 'SALARY', type: 'SALARY/UNCATEGORIZED', subType: 'SALARY/UNCATEGORIZED/UNCATEGORIZED' },
  },
  IK: {
    classification: { category: 'KSK_SERVICE_CENTER', type: 'KSK_SERVICE_CENTER.UNCATEGORIZED' },
    labels: { category: 'KSK_SERVICE_CENTER', type: 'KSK_SERVICE_CENTER/UNCATEGORIZED' },
  },
  MSVA: { classification: { category: 'MSVA', type: 'MSVA.UNCATEGORIZED' } },
  ROB: { classification: { category: 'COMPLETE_RECRUITMENT', type: 'COMPLETE_RECRUITMENT.RETAKE' } },
  SE: {
    classification: { category: 'UNCATEGORIZED', type: 'UNCATEGORIZED/UNCATEGORISED' },
    labels: { category: 'UNCATEGORIZED', type: 'UNCATEGORIZED/UNCATEGORISED' },
  },
  BOU: {
    classification: { category: 'BOU', type: 'BOU/UNCATEGORIZED' },
    labels: { category: 'BOU', type: 'BOU/UNCATEGORIZED' },
  },
  LOK: {
    classification: { category: 'IAF', type: 'IAF/WORK_AND_LIVELIHOOD' },
    labels: { category: 'IAF', type: 'IAF/WORK_AND_LIVELIHOOD' },
  },
  IAF: {
    labels: { category: 'REPORT_TYPE', type: 'REPORT_TYPE/DEVIATION' },
    parameters: [{ key: 'eventType', displayName: 'Rapporttyp', values: ['AVVIKELSE'] }],
  },
  VOF: {
    labels: { category: 'REPORT_TYPE', type: 'REPORT_TYPE/DEVIATION' },
    parameters: [{ key: 'eventType', displayName: 'Rapporttyp', values: ['AVVIKELSE'] }],
  },
};

export const getNewErrandDefaults = (application?: string): NewErrandDefaults | undefined => NEW_ERRAND_DEFAULTS[application ?? ''];

/** Resolves the complete configured registration label path or fails before creating a partial errand. */
export const resolveDefaultLabels = (labelStructure: Label[] | undefined, names: LabelSpec): Label[] => {
  const resolveUnique = (labels: Label[] | undefined, resourcePath: string): Label => {
    const matches = (labels ?? []).filter(label => label.resourcePath === resourcePath);
    if (matches.length !== 1) {
      throw new HttpException(502, `Registration label path ${resourcePath} resolved ${matches.length} times`);
    }
    return matches[0];
  };

  const category = resolveUnique(labelStructure, names.category);
  const type = resolveUnique(category.labels, names.type);
  if (!names.subType) return [category, type];
  return [category, type, resolveUnique(type.labels, names.subType)];
};

/**
 * Structural shapes of the classification payload. The controller's class-validator DTOs satisfy
 * these, which keeps the validation classes in the controller without the service importing them.
 */
export interface ClassificationSpec {
  category: string;
  type: string;
}

export interface LabelIdReference {
  id: string;
}

export interface SupportErrandClassificationSelection {
  classification: ClassificationSpec;
  categoryLabels: LabelIdReference[];
}

/**
 * One resolvable path through the Support Management label tree.
 *
 * NOTE: the mapping to `classification` is deliberately shifted by one level, so the field
 * names do not line up with the metadata classification strings they carry:
 *
 *   configured owner node (`owner`)    -> classification.category
 *   configured category (`category`)   -> classification.type
 *   configured type nodes (`types`)    -> neither field; contribute selected label ids only
 *
 * When there is no configured owner ancestor, `classification.category` falls back to the
 * category node, so category and type then hold the same resource. This mapping is an invariant
 * of the fixed IAF/VOF investigation classification rule. The
 * frontend performs the same mapping and documents it at
 * `investigation/label-classification/iaf-supportmanagement-label-classification.ts`
 * ("Support Management persists the selected CATEGORY resource in classification.type").
 * Keep the two in step — they are two implementations of one rule.
 */
interface SupportErrandClassificationBinding {
  owner?: Label;
  category: Label;
  types: Label[];
}

interface SupportErrandClassificationMetadata {
  bindings: SupportErrandClassificationBinding[];
  managedLabels: Label[];
}

const normalizeLabelClassification = (classification: string | undefined): string => (classification ?? '').trim().split('_').join('-').toUpperCase();

const normalizeLabelResource = normalizeSupportManagementResourcePath;

const isCategoryLabel = (
  label: NonNullable<Errand['labels']>[number],
  managedCategoryLabelIds: ReadonlySet<string>,
  managedRootResource: string | undefined,
): boolean => {
  const resourcePath = normalizeLabelResource(label.resourcePath);
  const rootResource = normalizeLabelResource(managedRootResource);
  return (
    (Boolean(rootResource) && (resourcePath === rootResource || resourcePath.startsWith(`${rootResource}/`))) ||
    (typeof label.id === 'string' && managedCategoryLabelIds.has(label.id))
  );
};

const getLabelResource = (label: Label): string =>
  typeof label.resourcePath === 'string' && label.resourcePath.trim().length > 0 ? label.resourcePath : label.resourceName;

const requireMetadataLabelResource = (label: Label): string => {
  if (typeof label.resourcePath === 'string' && label.resourcePath.trim().length > 0) return label.resourcePath;
  if (typeof label.resourceName === 'string' && label.resourceName.trim().length > 0) return label.resourceName;
  throw new HttpException(502, 'Support Management classification metadata contains a label without resource');
};

const findClassificationTypeLabels = (labels: readonly Label[] | undefined, labelTree: IafVofInvestigationClassificationLabelTree): Label[] => {
  const types: Label[] = [];

  const visit = (nodes: readonly Label[]) => {
    for (const node of nodes) {
      const classification = normalizeLabelClassification(node.classification);
      if (classification === normalizeLabelClassification(labelTree.typeClassification)) {
        types.push(node);
      } else if (classification !== normalizeLabelClassification(labelTree.categoryClassification) && node.labels?.length) {
        visit(node.labels);
      }
    }
  };

  visit(labels ?? []);
  return types;
};

const getSupportErrandClassificationMetadata = (
  labelStructure: readonly Label[],
  labelTree: IafVofInvestigationClassificationLabelTree,
): SupportErrandClassificationMetadata => {
  const bindings: SupportErrandClassificationBinding[] = [];

  const visit = (nodes: readonly Label[], owner?: Label) => {
    for (const node of nodes) {
      const classification = normalizeLabelClassification(node.classification);
      if (classification === normalizeLabelClassification(labelTree.categoryClassification)) {
        bindings.push({ owner, category: node, types: findClassificationTypeLabels(node.labels, labelTree) });
        continue;
      }

      const nextOwner = classification === normalizeLabelClassification(labelTree.ownerClassification) ? node : owner;
      if (node.labels?.length) visit(node.labels, nextOwner);
    }
  };

  const categoryRoots = labelStructure.filter(label => {
    const classification = normalizeLabelClassification(label.classification);
    return (
      classification === normalizeLabelClassification(labelTree.root.classification) &&
      normalizeLabelResource(getLabelResource(label)) === normalizeLabelResource(labelTree.root.resource)
    );
  });
  if (categoryRoots.length !== 1) {
    throw new HttpException(
      502,
      `Support Management classification metadata expected one configured root ${labelTree.root.resource}/${labelTree.root.classification}, found ${categoryRoots.length}`,
    );
  }
  const categoryRoot = categoryRoots[0];
  if (categoryRoot?.labels?.length) visit(categoryRoot.labels);
  if (bindings.length === 0) {
    throw new HttpException(
      502,
      `Support Management classification metadata contains no ${labelTree.categoryClassification} labels under the configured root`,
    );
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

export interface ResolvedSupportErrandClassification {
  classification: ClassificationSpec;
  categoryLabels: LabelIdReference[];
  managedCategoryLabelIds: string[];
  managedRootResource: string;
}

const buildClassificationMetadataIds = (labels: readonly Label[]): Map<string, Label> => {
  const metadataIds = new Map<string, Label>();
  for (const label of labels) {
    const id = requireMetadataLabelId(label);
    if (metadataIds.has(id)) {
      throw new HttpException(502, 'Support Management classification metadata contains duplicate label ids');
    }
    metadataIds.set(id, label);
  }
  return metadataIds;
};

const bindingMatchesClassification = (binding: SupportErrandClassificationBinding, classification: ClassificationSpec): boolean => {
  const categoryLabel = binding.owner ?? binding.category;
  return (
    normalizeLabelResource(requireMetadataLabelResource(categoryLabel)) === normalizeLabelResource(classification.category) &&
    normalizeLabelResource(requireMetadataLabelResource(binding.category)) === normalizeLabelResource(classification.type)
  );
};

const requireMatchingClassificationBinding = (
  bindings: readonly SupportErrandClassificationBinding[],
  classification: ClassificationSpec,
): SupportErrandClassificationBinding => {
  for (const binding of bindings) {
    for (const label of [...(binding.owner ? [binding.owner] : []), binding.category, ...binding.types]) {
      requireMetadataLabelResource(label);
    }
  }

  const matches = bindings.filter(binding => bindingMatchesClassification(binding, classification));
  if (matches.length === 0) {
    throw new HttpException(400, 'Classification does not match the configured Support Management label tree');
  }
  if (matches.length > 1) {
    throw new HttpException(502, 'Support Management classification metadata contains an ambiguous configured category path');
  }
  return matches[0];
};

const resolveSubmittedClassificationLabelIds = (
  binding: SupportErrandClassificationBinding,
  categoryLabels: readonly LabelIdReference[],
): string[] => {
  const submittedIds = categoryLabels.map(label => label.id);
  const submittedIdSet = new Set(submittedIds);
  if (submittedIdSet.size !== submittedIds.length) {
    throw new HttpException(400, 'Classification label ids must be unique');
  }

  const ownerId = binding.owner ? requireMetadataLabelId(binding.owner) : undefined;
  const categoryId = requireMetadataLabelId(binding.category);
  const typeIds = binding.types.map(type => requireMetadataLabelId(type));
  const selectedTypeIds = typeIds.filter(id => submittedIdSet.has(id));
  const expectedSelectedTypeCount = typeIds.length > 0 ? 1 : 0;
  if (selectedTypeIds.length !== expectedSelectedTypeCount) {
    throw new HttpException(400, 'Classification must contain exactly one valid undercategory when required');
  }

  const expectedIds = [...(ownerId ? [ownerId] : []), categoryId, ...selectedTypeIds];
  if (submittedIds.length !== expectedIds.length || submittedIds.some(id => !expectedIds.includes(id))) {
    throw new HttpException(400, 'Classification label ids do not match the selected configured category path');
  }
  return expectedIds;
};

/**
 * Validates a submitted classification against the configured metadata tree and returns the canonical
 * resource names plus the exact label ids that path implies. Throws 400 for a payload that does not
 * match the tree, and 502 when the metadata itself is unusable.
 */
export const resolveSupportErrandClassification = (
  data: SupportErrandClassificationSelection,
  labelStructure: readonly Label[] | undefined,
  labelTree: IafVofInvestigationClassificationLabelTree,
): ResolvedSupportErrandClassification => {
  if (!labelStructure) {
    throw new HttpException(502, 'Support Management classification metadata is unavailable');
  }

  const { bindings, managedLabels } = getSupportErrandClassificationMetadata(labelStructure, labelTree);
  const metadataIds = buildClassificationMetadataIds(managedLabels);
  const binding = requireMatchingClassificationBinding(bindings, data.classification);
  const expectedIds = resolveSubmittedClassificationLabelIds(binding, data.categoryLabels);

  return {
    classification: {
      category: binding.owner ? requireMetadataLabelResource(binding.owner) : requireMetadataLabelResource(binding.category),
      type: requireMetadataLabelResource(binding.category),
    },
    categoryLabels: expectedIds.map(id => ({ id })),
    managedCategoryLabelIds: [...metadataIds.keys()],
    managedRootResource: labelTree.root.resource,
  };
};

/**
 * Builds the PATCH body for a classification change, keeping every label that the configured tree does
 * not own so unrelated labels survive the update.
 */
export const buildSupportErrandClassificationUpdateBody = (
  data: SupportErrandClassificationSelection,
  currentLabels: Errand['labels'],
  categoryLabels: readonly LabelIdReference[] = data.categoryLabels,
  classification: ClassificationSpec = data.classification,
  managedCategoryLabelIds: readonly string[] = categoryLabels.map(label => label.id),
  managedRootResource?: string,
): { classification: ClassificationSpec; labels: LabelIdReference[] } => {
  const managedCategoryLabelIdSet = new Set(managedCategoryLabelIds);
  const preservedLabelIds = (currentLabels ?? [])
    .filter(label => !isCategoryLabel(label, managedCategoryLabelIdSet, managedRootResource))
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

const STRONG_ERRAND_ETAG_PATTERN = /^"(0|[1-9]\d*)"$/u;

/**
 * Parses the required optimistic-locking precondition for every errand mutation.
 * Weak validators, wildcard validators, lists and non-canonical numeric values are rejected.
 */
export const requireStrongErrandVersion = (ifMatch: string | undefined): number => {
  if (ifMatch === undefined) {
    throw new HttpException(428, 'If-Match is required when updating a support errand');
  }

  const match = STRONG_ERRAND_ETAG_PATTERN.exec(ifMatch);
  const version = match ? Number(match[1]) : Number.NaN;
  if (!match || !Number.isSafeInteger(version)) {
    throw new HttpException(400, 'If-Match must contain one strong numeric ETag');
  }

  return version;
};

/** Ensures the caller edited the same errand version that is current upstream. */
export const assertRequestedErrandVersion = (requestedVersion: number, currentVersion: number): void => {
  if (requestedVersion !== currentVersion) {
    throw new HttpException(412, 'If-Match does not match the current support errand version');
  }
};

/**
 * Reads the errand's optimistic locking version from the ETag header, falling back to the body.
 * Both are checked against each other so a stale or malformed version never reaches an If-Match.
 */
export const getErrandVersion = (errand: Errand, responseETag: unknown): number => {
  let responseVersion: number | undefined;
  if (responseETag !== undefined) {
    const match = typeof responseETag === 'string' ? STRONG_ERRAND_ETAG_PATTERN.exec(responseETag) : null;
    responseVersion = match ? Number(match[1]) : Number.NaN;
    if (!Number.isSafeInteger(responseVersion)) {
      throw new HttpException(502, 'Support Management response contains an invalid errand ETag');
    }
  }
  const bodyVersion = typeof errand.version === 'number' && Number.isSafeInteger(errand.version) && errand.version >= 0 ? errand.version : undefined;
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

const LOCKED_SUPPORT_ERRAND_STATUSES = new Set(['SOLVED', 'SUSPENDED', 'ASSIGNED', 'REOPENED']);

/**
 * Assigning a handler is how an errand leaves the parked states, so only the terminal one
 * locks it. The UI offers "Ta ärende" regardless of status and follows it with a transition
 * to ONGOING; locking SUSPENDED/ASSIGNED/REOPENED here would strand those errands.
 */
const LOCKED_SUPPORT_ERRAND_ADMIN_STATUSES = new Set(['SOLVED']);

/** Mirrors the product's write lock at the backend boundary for all new command routes. */
export const assertSupportErrandWritable = (errand: Pick<Errand, 'status'>, operation: string): void => {
  if (LOCKED_SUPPORT_ERRAND_STATUSES.has(errand.status ?? '')) {
    throw new HttpException(409, `Support errand status does not allow ${operation}`);
  }
};

export const assertSupportErrandAdminAssignable = (errand: Pick<Errand, 'status'>, operation: string): void => {
  if (LOCKED_SUPPORT_ERRAND_ADMIN_STATUSES.has(errand.status ?? '')) {
    throw new HttpException(409, `Support errand status does not allow ${operation}`);
  }
};

export interface SupportErrandStatusTransitionCommand {
  expectedStatus: string;
  status: string;
  resolution?: string;
  suspension?: Suspension;
}

export interface ResolvedSupportErrandStatusTransition {
  status: string;
  resolution?: string;
  suspension?: Suspension;
}

/**
 * Resolves a status command against the freshly read errand and namespace metadata.
 *
 * Support Management does not expose a status-transition graph. Requiring the exact current
 * status prevents a caller from applying a command whose source state has changed, while the
 * metadata check prevents arbitrary or deprecated target values without inventing app-specific
 * transition rules in Draken.
 */
export const resolveSupportErrandStatusTransition = (
  errand: Pick<Errand, 'status'>,
  statuses: readonly Pick<SupportManagementStatus, 'name' | 'deprecated'>[] | undefined,
  command: SupportErrandStatusTransitionCommand,
): ResolvedSupportErrandStatusTransition => {
  if (!errand.status) {
    throw new HttpException(502, 'Support Management response is missing the current errand status');
  }
  if (errand.status !== command.expectedStatus) {
    throw new HttpException(409, 'Support errand status has changed since it was loaded');
  }
  if (!statuses) {
    throw new HttpException(502, 'Support Management metadata is missing statuses');
  }
  if (!statuses.some(status => status.name === command.status && !status.deprecated)) {
    throw new HttpException(400, 'Target status is not available in Support Management metadata');
  }

  return {
    status: command.status,
    ...(command.resolution !== undefined ? { resolution: command.resolution } : {}),
    ...(command.suspension !== undefined ? { suspension: command.suspension } : {}),
  };
};

export interface ResolvedSupportErrandPhaseTransition {
  transitionId: string;
  targetPhaseId: string;
}

/**
 * Resolves an explicit workflow transition against the current errand and fresh metadata.
 * Metadata order is never used as a decision; branched workflows must submit a transition id.
 */
export const resolveSupportErrandPhaseTransition = (
  errand: Errand,
  phases: readonly Phase[] | undefined,
  transitionId: string,
): ResolvedSupportErrandPhaseTransition => {
  assertSupportErrandWritable(errand, 'phase transitions');
  if (!errand.activePhaseId) {
    throw new HttpException(409, 'Support errand has no active phase');
  }

  const activePhase = phases?.find(phase => phase.id === errand.activePhaseId && !phase.deprecated);
  if (!activePhase) {
    throw new HttpException(502, 'Support Management metadata is missing the active phase');
  }

  const transition = activePhase.transitions?.find(candidate => candidate.id === transitionId && !candidate.deprecated);
  if (!transition) {
    throw new HttpException(400, 'Phase transition is not available from the active phase');
  }

  const targetPhase = phases?.find(phase => phase.id === transition.targetPhaseId && !phase.deprecated);
  if (!targetPhase?.id) {
    throw new HttpException(502, 'Support Management metadata contains an invalid phase transition target');
  }

  return { transitionId, targetPhaseId: targetPhase.id };
};

/** Maps SupportManagement contact channels onto CaseData contact information, dropping unknown types. */
export const mapContactChannels = (channels?: ContactChannel[]): ContactInformation[] => {
  if ((channels?.length ?? 0) === 0) return [];
  return (channels ?? [])
    .map(c =>
      c.type === ContactChannelType.PHONE
        ? { contactType: ContactInformationContactTypeEnum.PHONE, value: c.value }
        : c.type === ContactChannelType.EMAIL
          ? { contactType: ContactInformationContactTypeEnum.EMAIL, value: c.value }
          : null,
    )
    .filter((x): x is NonNullable<typeof x> => x !== null);
};

const mapAddresses = (s: SupportStakeholder): CasedataStakeholderDTO['addresses'] =>
  s.address
    ? [
        {
          addressCategory: AddressAddressCategoryEnum.POSTAL_ADDRESS,
          street: s.address,
          postalCode: s.zipCode || '',
          city: s.city || '',
          careOf: s.careOf || '',
        },
      ]
    : [];

/**
 * Maps a SupportManagement stakeholder onto a CaseData stakeholder when forwarding an errand.
 * `organizationNumber` is resolved by the caller (stakeholder parameter or Legal Entity lookup)
 * and only emitted for COMPANY stakeholders.
 */
export const toCasedataStakeholder = (s: SupportStakeholder, organizationNumber?: string): CasedataStakeholderDTO => {
  const roles = [s.role === SupportStakeholderRole.PRIMARY ? Role.APPLICANT : Role.CONTACT_PERSON];
  if (s.externalIdType === ExternalIdType.COMPANY) {
    return {
      type: CasedataStakeholderDtoTypeEnum.ORGANIZATION,
      roles,
      addresses: mapAddresses(s),
      contactInformation: mapContactChannels(s.contactChannels),
      firstName: '',
      lastName: '',
      organizationName: s.organizationName,
      ...(s.externalId && { personId: s.externalId }),
      ...(organizationNumber && { organizationNumber }),
    };
  }
  return {
    type: CasedataStakeholderDtoTypeEnum.PERSON,
    roles,
    addresses: mapAddresses(s),
    contactInformation: mapContactChannels(s.contactChannels),
    firstName: s.firstName,
    lastName: s.lastName ? s.lastName : '',
    ...(s.externalId && { personId: s.externalId }),
  };
};

/**
 * Maps a SupportManagement channel name onto the closest CaseData channel.
 * Several SupportManagement channels have no CaseData counterpart and fall back to WEB_UI;
 * an unknown or missing channel falls back to EMAIL.
 */
export const toCasedataChannel = (channel?: string): CasedataErrandDtoChannelEnum => {
  const supportChannel: SupportManagementChannels = SupportManagementChannels[channel as keyof typeof SupportManagementChannels];
  switch (supportChannel) {
    case SupportManagementChannels.CHAT:
      // TODO Missing matching channel in CaseData
      return CasedataErrandDtoChannelEnum.WEB_UI;
    case SupportManagementChannels.EMAIL:
      return CasedataErrandDtoChannelEnum.EMAIL;
    case SupportManagementChannels.IN_PERSON:
      // TODO Missing matching channel in CaseData
      return CasedataErrandDtoChannelEnum.WEB_UI;
    case SupportManagementChannels.SOCIAL_MEDIA:
      // TODO Missing matching channel in CaseData
      return CasedataErrandDtoChannelEnum.WEB_UI;
    case SupportManagementChannels.PHONE:
      // TODO Missing matching channel in CaseData
      return CasedataErrandDtoChannelEnum.MOBILE;
    case SupportManagementChannels.WEB_UI:
      return CasedataErrandDtoChannelEnum.WEB_UI;
    case SupportManagementChannels.ESERVICE:
      return CasedataErrandDtoChannelEnum.ESERVICE;
    default:
      return CasedataErrandDtoChannelEnum.EMAIL;
  }
};

/** Turns the `propertyDesignation` errand parameter into CaseData facilities. */
export const toFacilities = (parameters?: Parameter[]): FacilityDTO[] => {
  const estates = (parameters ?? []).filter(obj => obj.key === 'propertyDesignation')[0]?.values;
  return (estates ?? []).map(facility => ({ address: { propertyDesignation: facility } }));
};

// SupportManagement owns the optimistic locking `version` on errands and parameters: it is returned on
// reads but rejected with "must be null" when sent back on update. The frontend echoes fetched errands
// straight back, so strip the field from everything we forward.
type Versioned = { version?: number };

type VersionedErrand = Versioned & {
  parameters?: Versioned[];
  jsonParameters?: Versioned[];
  stakeholders?: { parameters?: Versioned[] }[];
};

const withoutVersion = <T extends Versioned>(item: T): Omit<T, 'version'> => {
  const { version: _version, ...itemWithoutVersion } = item;
  return itemWithoutVersion;
};

/** Removes the server-managed `version` from a list of errand, stakeholder or JSON parameters. */
export const stripParameterVersions = <T extends Versioned>(parameters: T[]): Omit<T, 'version'>[] => parameters.map(withoutVersion);

/** Removes the server-managed `version` from an errand and all parameters it carries. */
export const stripErrandVersions = <T extends VersionedErrand>(errand: T): T =>
  ({
    ...withoutVersion(errand),
    ...(errand.parameters && { parameters: stripParameterVersions(errand.parameters) }),
    ...(errand.jsonParameters && { jsonParameters: stripParameterVersions(errand.jsonParameters) }),
    ...(errand.stakeholders && {
      stakeholders: errand.stakeholders.map(stakeholder => ({
        ...stakeholder,
        ...(stakeholder.parameters && { parameters: stripParameterVersions(stakeholder.parameters) }),
      })),
    }),
  }) as T;

/** Base64-encodes a fetched attachment into the CaseData attachment payload. */
export const toAttachmentDto = (attachmentData: ErrandAttachment, fileData: ArrayBuffer, errandNumber: string): FormData => {
  // const binaryString = Array.from(new Uint8Array(fileData), v => String.fromCharCode(v)).join('');
  // const b64 = Buffer.from(binaryString, 'binary').toString('base64');
  // return {
  //   file: b64,
  //   category: 'OTHER',
  //   extension: attachment.fileName!.split('.').pop()!,
  //   mimeType: attachment.mimeType!,
  //   name: attachment.fileName!,
  //   note: '',
  //   errandNumber,
  //   channel: AttachmentChannelEnum.WEB_UI,
  // };
  const metadata: CreateAttachmentDto = {
    category: 'OTHER',
    extension: attachmentData.fileName!.split('.').pop()!,
    mimeType: attachmentData.mimeType!,
    name: attachmentData.fileName!,
    note: '',
    errandNumber: errandNumber!,
    channel: AttachmentChannelEnum.WEB_UI,
  };

  const data = new FormData();

  if (fileData) {
    data.append('file', Buffer.from(fileData), {
      filename: attachmentData.fileName ?? '',
      contentType: attachmentData.mimeType,
    });
    data.append('attachment', JSON.stringify(metadata));
  } else {
    logger.error('Trying to save attachment without name or data');
    throw new Error('File missing');
  }

  return data;
};
