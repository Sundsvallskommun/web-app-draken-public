import dayjs from 'dayjs';
import FormData from 'form-data';

import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
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
  Stakeholder as SupportStakeholder,
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
  classification: { category: string; type: string };
  labels?: LabelSpec;
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
};

export const getNewErrandDefaults = (application?: string): NewErrandDefaults | undefined => NEW_ERRAND_DEFAULTS[application ?? ''];

/**
 * Walks the metadata label tree by `resourcePath`, returning the longest prefix of
 * [category, type, subType] that could be resolved.
 */
export const resolveDefaultLabels = (labelStructure: Label[] | undefined, names: LabelSpec): Label[] => {
  const categoryObject = labelStructure?.find(l => l.resourcePath === names.category);
  if (!categoryObject) return [];
  if (!names.type) return [categoryObject];
  const typeObject = categoryObject.labels?.find(l => l.resourcePath === names.type);
  if (!typeObject) return [categoryObject];
  if (!names.subType) return [categoryObject, typeObject];
  const subTypeObject = typeObject.labels?.find(l => l.resourcePath === names.subType);
  if (!subTypeObject) return [categoryObject, typeObject];
  return [categoryObject, typeObject, subTypeObject];
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
 *   PROVISION-CATEGORY node (`owner`)  -> classification.category
 *   CATEGORY node (`category`)         -> classification.type
 *   TYPE nodes (`types`)               -> neither field; contribute selected label ids only
 *
 * When there is no PROVISION-CATEGORY ancestor, `classification.category` falls back to the
 * CATEGORY node, so category and type then hold the same resource. The frontend performs the
 * same mapping and documents it at
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

const normalizeLabelClassification = (classification: string | undefined): string => (classification ?? '').trim().replace(/_/g, '-').toUpperCase();

const normalizeLabelResource = (resource: string | undefined): string =>
  (resource ?? '')
    .trim()
    .replace(/^\/+|\/+$/gu, '')
    .toUpperCase();

const isCategoryLabel = (label: NonNullable<Errand['labels']>[number], managedCategoryLabelIds: ReadonlySet<string>): boolean => {
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

export interface ResolvedSupportErrandClassification {
  classification: ClassificationSpec;
  categoryLabels: LabelIdReference[];
  managedCategoryLabelIds: string[];
}

/**
 * Validates a submitted classification against the metadata CATEGORY tree and returns the canonical
 * resource names plus the exact label ids that path implies. Throws 400 for a payload that does not
 * match the tree, and 502 when the metadata itself is unusable.
 */
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

/**
 * Builds the PATCH body for a classification change, keeping every label that the CATEGORY tree does
 * not own so unrelated labels survive the update.
 */
export const buildSupportErrandClassificationUpdateBody = (
  data: SupportErrandClassificationSelection,
  currentLabels: Errand['labels'],
  categoryLabels: readonly LabelIdReference[] = data.categoryLabels,
  classification: ClassificationSpec = data.classification,
  managedCategoryLabelIds: readonly string[] = categoryLabels.map(label => label.id),
): { classification: ClassificationSpec; labels: LabelIdReference[] } => {
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

/**
 * Reads the errand's optimistic locking version from the ETag header, falling back to the body.
 * Both are checked against each other so a stale or malformed version never reaches an If-Match.
 */
export const getErrandVersion = (errand: Errand, responseETag: unknown): number => {
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
