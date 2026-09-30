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
  ErrandLabel,
  Label,
  Parameter,
  Stakeholder as SupportStakeholder,
} from '@/data-contracts/supportmanagement/data-contracts';
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
const SAFE_CHARS_REGEX = /[^\p{L}\p{N}\s.\-_,:]/gu;

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
  classification?: { category: string; type: string };
  labels?: LabelSpec;
}

// Default classification or labels applied to a new empty errand, per application (drake).
// Label-based applications classify errands with labels only and get no default classification.
// Applications without an entry get neither.
export const NEW_ERRAND_DEFAULTS: Record<string, NewErrandDefaults> = {
  KC: { labels: { category: 'KSK', type: 'KSK/NO_CASE_SPECIFIED' } },
  KA: {
    labels: { category: 'ADMINISTRATION', type: 'ADMINISTRATION/CONTACT_CENTER', subType: 'ADMINISTRATION/CONTACT_CENTER/GENERAL' },
  },
  LOP: {
    labels: { category: 'SALARY', type: 'SALARY/UNCATEGORIZED', subType: 'SALARY/UNCATEGORIZED/UNCATEGORIZED' },
  },
  IK: { labels: { category: 'KSK_SERVICE_CENTER', type: 'KSK_SERVICE_CENTER/UNCATEGORIZED' } },
  MSVA: { classification: { category: 'MSVA', type: 'MSVA.UNCATEGORIZED' } },
  ROB: { classification: { category: 'COMPLETE_RECRUITMENT', type: 'COMPLETE_RECRUITMENT.RETAKE' } },
  SE: { labels: { category: 'UNCATEGORIZED', type: 'UNCATEGORIZED/UNCATEGORISED' } },
  BOU: { labels: { category: 'BOU', type: 'BOU/UNCATEGORIZED' } },
  LOK: { labels: { category: 'IAF', type: 'IAF/WORK_AND_LIVELIHOOD' } },
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
 * Resolves the labels stored on an errand to their branch of the metadata label tree, from the top
 * level down: index 0 is the first level (verksamhet), 1 the second and 2 the third.
 *
 * Levels are positions in the tree, not the labels' own `classification`: one namespace names its
 * levels CATEGORY/TYPE/SUBTYPE, another DEPARTMENT/CATEGORY/TYPE. Labels are matched on id, with
 * resource path as fallback, and never by splitting the path, since a resource path is not reliably
 * a chain of the resource names above it. The branch to the deepest matching label is returned,
 * ancestors included, so an errand that only carries its leaf label still resolves fully.
 */
export const resolveErrandLabelPath = (errandLabels: ErrandLabel[] | undefined, labelStructure: Label[] | undefined): Label[] => {
  const ids = new Set(errandLabels?.map(errandLabel => errandLabel.id));
  const resourcePaths = new Set(errandLabels?.map(errandLabel => errandLabel.resourcePath));
  let deepestBranch: Label[] = [];

  // Visits every label in the tree, keeping the longest branch that ends in a label the errand carries.
  const visit = (label: Label, ancestors: Label[]) => {
    const branch = [...ancestors, label];
    const carriedByErrand = (!!label.id && ids.has(label.id)) || (!!label.resourcePath && resourcePaths.has(label.resourcePath));
    if (carriedByErrand && branch.length > deepestBranch.length) {
      deepestBranch = branch;
    }
    label.labels?.forEach(child => visit(child, branch));
  };

  labelStructure?.forEach(topLevelLabel => visit(topLevelLabel, []));
  return deepestBranch;
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
