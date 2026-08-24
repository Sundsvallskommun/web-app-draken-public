import { Label, Stakeholder as SupportStakeholder } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { apiService, Data } from '@common/services/api-service';
import { isKC, isLOK, isROB } from '@common/services/application-service';
import sanitized from '@common/services/sanitizer-service';
import { appConfig } from '@config/appconfig';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import { ForwardFormProps } from '@supportmanagement/components/support-errand/sidebar/buttons/support-forward-errand-button.component';
import { ApiPagingData, RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { All, Priority } from '@supportmanagement/interfaces/priority';
import { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { useCallback, useEffect } from 'react';
import { CParameter, SupportErrandDto } from 'src/data-contracts/backend/data-contracts';
import { v4 as uuidv4 } from 'uuid';

import { saveSupportAttachments, SupportAttachment } from './support-attachment-service';
import type { SupportErrandFilterQuery, SupportErrandSortQuery } from './support-errand-query';
import { buildSupportErrandsCountSearchParameters, buildSupportErrandsSearchParameters } from './support-errand-query';
import {
  buildSupportErrandStatusTransitionRequest,
  SupportErrandStatusTransitionChanges,
  SupportErrandStatusTransitionRequest,
} from './support-errand-status-transition';
import { buildSupportErrandUpdateData } from './support-errand-update-data';
import { toStrongSupportErrandETag } from './support-errand-write-version';
import { getMappedLabelSubType, shouldMapLabelSubType } from './support-label-classification-service';
import { MessageRequest, sendMessage } from './support-message-service';
import { saveSupportNote } from './support-note-service';
import { buildStakeholdersList, mapExternalIdTypeToStakeholderType } from './support-stakeholder-service';
export interface Customer {
  id: string;
  type: 'PRIVATE' | 'ENTERPRISE' | 'EMPLOYEE';
}

export enum ExternalIdType {
  PRIVATE = 'PRIVATE',
  ENTERPRISE = 'ENTERPRISE',
  EMPLOYEE = 'EMPLOYEE',
  COMPANY = 'COMPANY',
}

// Keeping both enums for now, as the backend uses the uppercase version
// but existing stakeholders use the lowercase version
export enum ContactChannelType {
  Email = 'Email',
  EMAIL = 'EMAIL',
  Phone = 'Phone',
  PHONE = 'PHONE',
}

export enum PrettyRelation {
  PERSON = 'Person',
}

// Define an enum for the stakeholder types
export enum SupportStakeholderTypeEnum {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
}

export interface RequestInfo {
  contactMeans: string;
  email: string;
  phone: string;
  message: string;
  messageBodyPlaintext: string;
}

// Define a type based on the enum values
export type SupportStakeholderType = keyof typeof SupportStakeholderTypeEnum;

export type ExternalTags = Array<{ key: string; value: string }>;

/**
 * Read-only JSON parameter projection returned with an errand. It is kept out
 * of the generated SupportErrandDto because that DTO is the generic PATCH
 * contract, where JSON documents are deliberately forbidden.
 */
export interface SupportErrandJsonParameter {
  key: string;
  schemaId: string;
  value?: unknown;
  version?: number;
}

export interface ApiSupportErrand extends SupportErrandDto {
  id?: string;
  version?: number;
  created?: string;
  modified?: string;
  touched?: string;
  jsonParameters?: SupportErrandJsonParameter[];
}

export interface SupportErrand extends ApiSupportErrand {
  caseId?: string;
  category: string;
  type: string;
  subType: string;
  labels?: Label[];
  classificationHasSubTypes?: boolean;
  customer: SupportStakeholderFormModel[];
  contacts: SupportStakeholderFormModel[];
}

export interface PagedApiSupportErrands extends ApiPagingData {
  content: ApiSupportErrand[];
}

export interface SupportErrandsData extends Data {
  errands: SupportErrand[];
  isLoading?: boolean;
  page?: number;
  size?: number;
  totalPages?: number;
  totalElements?: number;
  labels: {
    label: string;
    screenReaderOnly: boolean;
    sortable: boolean;
    sticky?: boolean;
    shownForStatus: All | Status[];
  }[];
}

export interface ResolutionUpdate {
  id: string;
  category: string;
  type: string;
  status: Status;
  resolution: string;
  assignedUserId: string;
  escalationEmail?: string;
  escalationMessageBody?: string;
}

export enum Channels {
  PHONE = 'Telefon',
  CHAT = 'Chatt',
  EMAIL = 'E-post',
  IN_PERSON = 'Fysiskt möte',
  SOCIAL_MEDIA = 'Sociala medier',
  ESERVICE = 'E-tjänst',
  ESERVICE_INTERNAL = 'E-tjänst (intern)',
  WEB_UI = 'Draken webbgränssnitt',
}

// The channels a user can choose from when registering an errand.
// LOK is limited to phone, email and internal e-service.
const LOK_SELECTABLE_CHANNELS: (keyof typeof Channels)[] = ['PHONE', 'EMAIL', 'ESERVICE_INTERNAL'];

export const getSelectableChannels = (): [string, string][] => {
  const entries = Object.entries(Channels) as [string, string][];
  if (isLOK()) {
    return entries.filter(([key]) => LOK_SELECTABLE_CHANNELS.includes(key as keyof typeof Channels));
  }
  return entries;
};

export const municipalityIds = [
  { label: 'Sundsvall', id: '2281' },
  { label: 'Timrå', id: '2262' },
];

export enum Status {
  NEW = 'NEW',
  ONGOING = 'ONGOING',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  ASSIGNED = 'ASSIGNED',
  SOLVED = 'SOLVED',
  AWAITING_INTERNAL_RESPONSE = 'AWAITING_INTERNAL_RESPONSE',
  UPSTART = 'UPSTART',
  PUBLISH_SELECTION = 'PUBLISH_SELECTION',
  INTERNAL_CONTROL_AND_INTERVIEWS = 'INTERNAL_CONTROL_AND_INTERVIEWS',
  REFERENCE_CHECK = 'REFERENCE_CHECK',
  REVIEW = 'REVIEW',
  SECURITY_CLEARENCE = 'SECURITY_CLEARENCE',
  FEEDBACK_CLOSURE = 'FEEDBACK_CLOSURE',
  SUBPACKAGE_HANDLED = 'SUBPACKAGE_HANDLED',
  REOPENED = 'REOPENED',
}

export const shouldShowResumeErrandButton = (status?: Status): boolean => {
  return (
    !!status && [Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE, Status.SUSPENDED, Status.ASSIGNED].includes(status)
  );
};

export enum AttestationStatus {
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  NONE = 'NONE',
}

export enum AttestationStatusLabel {
  APPROVED = 'Godkänd',
  DENIED = 'Avslag',
  NONE = 'Attestera',
}

export const newStatuses = [Status.NEW];

export const ongoingStatuses = [Status.ONGOING, Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE, Status.REOPENED];

export const ongoingStatusesROB = [
  ...ongoingStatuses,
  Status.UPSTART,
  Status.PUBLISH_SELECTION,
  Status.INTERNAL_CONTROL_AND_INTERVIEWS,
  Status.REFERENCE_CHECK,
  Status.REVIEW,
  Status.SECURITY_CLEARENCE,
  Status.FEEDBACK_CLOSURE,
  Status.SUBPACKAGE_HANDLED,
];

export const suspendedStatuses = [Status.SUSPENDED];
export const assignedStatuses = [Status.ASSIGNED];

export const closedStatuses = [Status.SOLVED];

export const getStatusLabel = (statuses: Status[]) => {
  if (statuses.length > 0) {
    if (statuses.some((s) => newStatuses.includes(s))) {
      return 'Nya ärenden';
    } else if (statuses.some((s) => (isROB() ? ongoingStatusesROB.includes(s) : ongoingStatuses.includes(s)))) {
      return 'Öppna ärenden';
    } else if (statuses.some((s) => suspendedStatuses.includes(s))) {
      return 'Parkerade ärenden';
    } else if (statuses.some((s) => assignedStatuses.includes(s))) {
      return 'Tilldelade ärenden';
    } else if (statuses.some((s) => closedStatuses.includes(s))) {
      return 'Avslutade ärenden';
    } else {
      return 'Ärenden';
    }
  }
};

export const findPriorityKeyForPriorityLabel = (priorityKey: string) =>
  Object.entries(Priority).find((e: [string, string]) => e[1] === priorityKey)?.[0];

export const findPriorityLabelForPriorityKey = (priorityLabel: string) =>
  Object.entries(Priority).find((e: [string, string]) => e[0] === priorityLabel)?.[1];

export const findAttestationStatusKeyForAttestationStatusLabel = (attestationStatusKey: string) =>
  Object.entries(AttestationStatusLabel).find((e: [string, string]) => e[1] === attestationStatusKey)?.[0];

export const findAttestationStatusLabelForAttestationStatusKey = (attestationStatusLabel: string) =>
  Object.entries(AttestationStatusLabel).find((e: [string, string]) => e[0] === attestationStatusLabel)?.[1];

export {
  getErrandTypeLabel,
  getLabelCategory,
  getLabelCategoryFromName,
  getLabelSubType,
  getLabelSubTypeFromName,
  getLabelType,
  getLabelTypeFromName,
} from './support-label-classification-service';

export enum Resolution {
  SOLVED = 'SOLVED',
  REFERRED_VIA_EXCHANGE = 'REFERRED_VIA_EXCHANGE',
  CONNECTED = 'CONNECTED',
  REGISTERED_EXTERNAL_SYSTEM = 'REGISTERED_EXTERNAL_SYSTEM',
  SELF_SERVICE = 'SELF_SERVICE',
  INTERNAL_SERVICE = 'INTERNAL_SERVICE',
  CLOSED = 'CLOSED',
  BACK_TO_MANAGER = 'BACK_TO_MANAGER',
  BACK_TO_HR = 'BACK_TO_HR',
  REFER_TO_CONTACTSUNDSVALL = 'REFER_TO_CONTACTSUNDSVALL',
  REFER_TO_PHONE = 'REFER_TO_PHONE',
  REGISTERED = 'REGISTERED',
  SENT_MESSAGE = 'SENT_MESSAGE',
  NEED_MET = 'NEED_MET',
  RECRUITED_FEWER = 'RECRUITED_FEWER',
  RECRUITED_MORE = 'RECRUITED_MORE',
  CANCELLED = 'CANCELLED',
  SECURE_APPBOX = 'SECURE_APPBOX',
  BACK_TO_CONTACT_SUNDSVALL = 'BACK_TO_CONTACT_SUNDSVALL',
  FORWARDED_TO_DRAKFASTIGHETER = 'FORWARDED_TO_DRAKFASTIGHETER',
  FORWARDED_TO_EXTERNAL_LANDLORD = 'FORWARDED_TO_EXTERNAL_LANDLORD',
  FORWARDED_TO_INTERNAL_CONTRACTOR = 'FORWARDED_TO_INTERNAL_CONTRACTOR',
  FORWARDED_TO_EXTERNAL_CONTRACTOR = 'FORWARDED_TO_EXTERNAL_CONTRACTOR',
}

export enum ResolutionLabelLOP {
  CLOSED = 'Avslutat',
  BACK_TO_MANAGER = 'Åter till chef',
  BACK_TO_HR = 'Åter till HR',
  REGISTERED_EXTERNAL_SYSTEM = 'Registrerat i annat system',
}

export enum ResolutionLabelIK {
  REFER_TO_CONTACTSUNDSVALL = 'Hänvisat till Kontakt Sundsvall',
  SELF_SERVICE = 'Hänvisat till självservice',
  SOLVED = 'Informerat / Intern Kundtjänst har löst ärendet',
  REFER_TO_PHONE = 'Behöver återkomma/hänvisat till telefontid',
  REGISTERED = 'Tagit emot/registrerat/paketerat ärende',
  CONNECTED = 'Kopplat samtal',
  SENT_MESSAGE = 'Skickat ett meddelande',
}

export enum ResolutionLabelKS {
  SOLVED = 'Löst av Kontakt Sundsvall',
  REFERRED_VIA_EXCHANGE = 'Vidarebefordrat via växelprogrammet',
  CONNECTED = 'Kopplat samtal',
  REGISTERED_EXTERNAL_SYSTEM = 'Registrerat i annat system',
  SELF_SERVICE = 'Hänvisat till självservice',
  INTERNAL_SERVICE = 'Hänvisat till intern service',
  REFERRED_TO_RETURN = 'Hänvisat att återkomma',
  SECURE_APPBOX = 'SecureAppbox',
}

export enum ResolutionLabelKA {
  SOLVED = 'Löst av Kontaktcenter',
  REGISTERED_EXTERNAL_SYSTEM = 'Vidarebefordrad (ärendet har överlämnats till annan funktion)',
}
export enum ResolutionLabelROB {
  NEED_MET = 'Behov uppfyllt',
  RECRUITED_FEWER = 'Rekryterat färre',
  RECRUITED_MORE = 'Rekryterat fler',
  CANCELLED = 'Avbruten',
}

export enum ResolutionLabelBOU {
  SOLVED = 'Löst',
  BACK_TO_CONTACT_SUNDSVALL = 'Åter till Kontakt Sundsvall',
}

export enum ResolutionLabelLOK {
  SOLVED = 'Löst av VoF/IAF Lokalplanering',
  FORWARDED_TO_DRAKFASTIGHETER = 'Vidarebefordrat till Drakfastigheter',
  FORWARDED_TO_EXTERNAL_LANDLORD = 'Vidarebefordrat till extern hyresvärd',
  FORWARDED_TO_INTERNAL_CONTRACTOR = 'Vidarebefordrat till intern entreprenör',
  FORWARDED_TO_EXTERNAL_CONTRACTOR = 'Vidarebefordrat till extern entreprenör',
}
export interface SupportStakeholderFormModel extends SupportStakeholder {
  stakeholderType: SupportStakeholderType;
  internalId: string;
  organizationNumber?: string;
  personId?: string;
  personNumber?: string;
  title?: string;
  referenceNumber?: string;
  emails: { value: string }[];
  phoneNumbers: { value: string }[];
  username?: string;
  administrationCode?: string;
  administrationName?: string;
  department?: string;
  orgName?: string;
}

export const emptyContact: SupportStakeholderFormModel = {
  stakeholderType: SupportStakeholderTypeEnum.PERSON,
  internalId: '',
  externalId: '',
  personNumber: '',
  organizationNumber: '',
  externalIdType: isKC() ? ExternalIdType.PRIVATE : ExternalIdType.EMPLOYEE,
  username: '',
  firstName: '',
  lastName: '',
  address: '',
  zipCode: '',
  careOf: '',
  country: '',
  emails: [],
  phoneNumbers: [],
  contactChannels: [],
};

export const emptySupportErrandList: SupportErrandsData = {
  errands: [],
  labels: [],
};

export const defaultSupportErrandInformation: SupportErrand | any = {
  id: '',
  title: '',
  priority: 'MEDIUM',
  category: '',
  type: '',
  subType: '',
  classificationHasSubTypes: false,
  labels: [],
  contactReason: '',
  contactReasonDescription: undefined,
  businessRelated: false,
  status: 'NEW',
  suspension: {
    suspendedFrom: undefined,
    suspendedTo: undefined,
  },
  assignedUserId: undefined,
  assignedGroupId: undefined,
  resolution: 'INFORMED',
  channel: 'PHONE',
  municipalityId: process.env.NEXT_PUBLIC_MUNICIPALITY_ID,
  description: '',
  messageContact: 'false',
  contactMeans: 'useEmail',
  messageEmail: '',
  messagePhone: '',
  messageBody: '',
  newMessageAttachment: undefined,
  messageAttachments: [],
  contacts: [],
  newAttachment: undefined,
  attachments: [],
  externalTags: [],
  parameters: [],
};

export const isOpenEErrand: (supportErrand: SupportErrand) => boolean = (supportErrand) => {
  return !!supportErrand?.externalTags?.find((tag) => tag.key === 'caseId')?.value;
};

export const isSupportErrandLocked: (errand: SupportErrand) => boolean = (errand) => {
  return (
    errand?.status === Status.SOLVED ||
    errand?.status === Status.SUSPENDED ||
    errand?.status === Status.ASSIGNED ||
    errand?.status === Status.REOPENED
  );
};

export const useSupportErrands = (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: SupportErrandFilterQuery,
  sort?: SupportErrandSortQuery
): SupportErrandsData => {
  const toastMessage = useSnackbar();
  const setIsLoading = useConfigStore((s) => s.setIsLoading);
  const setSupportErrands = useSupportStore((s) => s.setSupportErrands);
  const supportErrands = useSupportStore((s) => s.supportErrands);
  const setNewSupportErrands = useUiSettingsStore((s) => s.setNewErrands);
  const newSupportErrands = useUiSettingsStore((s) => s.newErrands);
  const setOngoingSupportErrands = useUiSettingsStore((s) => s.setOngoingErrands);
  const ongoingSupportErrands = useUiSettingsStore((s) => s.ongoingErrands);
  const setSuspendedSupportErrands = useUiSettingsStore((s) => s.setSuspendedErrands);
  const suspendedSupportErrands = useUiSettingsStore((s) => s.suspendedErrands);
  const setAssignedSupportErrands = useUiSettingsStore((s) => s.setAssignedErrands);
  const assignedSupportErrands = useUiSettingsStore((s) => s.assignedErrands);
  const setSolvedSupportErrands = useUiSettingsStore((s) => s.setClosedErrands);
  const solvedSupportErrands = useUiSettingsStore((s) => s.closedErrands);

  const fetchErrands = useCallback(
    async (page: number = 0) => {
      setIsLoading(true);
      setNewSupportErrands(null);
      setOngoingSupportErrands(null);
      setSuspendedSupportErrands(null);
      setAssignedSupportErrands(null);
      setSolvedSupportErrands(null);
      setSupportErrands({ ...supportErrands, isLoading: true });

      const errandPromise = getSupportErrands(municipalityId, page, size, filter, sort)
        .then((res) => {
          setSupportErrands({ ...res, isLoading: false });
        })
        .catch(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Ärenden kunde inte hämtas',
            status: 'error',
          });
        });

      const sidebarUpdatePromises = [
        getSupportErrandsCount(municipalityId, { ...filter, status: Status.NEW })
          .then((res) => {
            setNewSupportErrands(res);
          })
          .catch(() => {
            setNewSupportErrands(0);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Nya ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrandsCount(municipalityId, {
          ...filter,
          status: isROB() ? ongoingStatusesROB.join(',') : ongoingStatuses.join(','),
        })
          .then((res) => {
            setOngoingSupportErrands(res);
          })
          .catch(() => {
            setOngoingSupportErrands(0);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Pågående ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrandsCount(municipalityId, { ...filter, status: `${Status.SUSPENDED}` })
          .then((res) => {
            setSuspendedSupportErrands(res);
          })
          .catch(() => {
            setSuspendedSupportErrands(0);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Parkerade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrandsCount(municipalityId, { ...filter, status: `${Status.ASSIGNED}` })
          .then((res) => {
            setAssignedSupportErrands(res);
          })
          .catch(() => {
            setAssignedSupportErrands(0);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Tilldelade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrandsCount(municipalityId, { ...filter, status: Status.SOLVED })
          .then((res) => {
            setSolvedSupportErrands(res);
          })
          .catch(() => {
            setSolvedSupportErrands(0);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Avslutade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),
      ];

      return Promise.allSettled([errandPromise, ...sidebarUpdatePromises]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      setSupportErrands,
      setNewSupportErrands,
      setOngoingSupportErrands,
      setSuspendedSupportErrands,
      setAssignedSupportErrands,
      setSolvedSupportErrands,
      supportErrands,
      newSupportErrands,
      ongoingSupportErrands,
      suspendedSupportErrands,
      assignedSupportErrands,
      solvedSupportErrands,
      size,
      filter,
      sort,
      toastMessage,
    ]
  );

  useEffect(() => {
    if (typeof page !== 'undefined' && size && size > 0) {
      fetchErrands().then(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, size, sort]);

  useEffect(() => {
    if (supportErrands.page !== undefined && page !== supportErrands.page) {
      fetchErrands(page).then(() => setIsLoading(false));
    }
    //eslint-disable-next-line
  }, [page]);

  return supportErrands;
};

export const getSupportErrandById: (
  id: string,
  municipalityId: string
) => Promise<{ errand: SupportErrand; error?: string }> = (id, municipalityId) => {
  let url = `supporterrands/${municipalityId}/${id}`;
  return apiService
    .get<ApiSupportErrand>(url)
    .then((res: any) => {
      const errand = mapApiSupportErrandToSupportErrand(res.data);
      return { errand };
    })
    .catch(
      (e) =>
        ({ errand: undefined as unknown as SupportErrand, error: e.response?.status ?? 'UNKNOWN ERROR' } as {
          errand: SupportErrand;
          error?: string;
        })
    );
};

export const getSupportErrandByErrandNumber: (
  errandnumber: string
) => Promise<{ errand: SupportErrand; error?: string }> = (errandnumber) => {
  let url = `supporterrands/errandnumber/${errandnumber}`;
  return apiService
    .get<ApiSupportErrand>(url)
    .then((res: any) => {
      const errand = mapApiSupportErrandToSupportErrand(res.data);
      return { errand };
    })
    .catch(
      (e) =>
        ({ errand: undefined as unknown as SupportErrand, error: e.response?.status ?? 'UNKNOWN ERROR' } as {
          errand: SupportErrand;
          error?: string;
        })
    );
};

export const supportErrandIsEmpty: (errand: SupportErrand) => boolean = (errand) => {
  if (!errand) {
    return true;
  } else if (
    !errand?.id ||
    !errand?.classification ||
    errand?.classification.category === 'NONE' ||
    errand?.classification.type === 'NONE' ||
    errand?.category === '' ||
    errand?.type === ''
  ) {
    return true;
  }
  return false;
};

// Resolve a stakeholder's organization number: prefer the dedicated parameter (written on save),
// and fall back to externalId for legacy COMPANY stakeholders saved before the org number was split out.
const getStakeholderOrganizationNumber = (s: SupportStakeholder): string | undefined =>
  s.parameters?.find((p) => p.key === 'organizationNumber')?.values?.[0] ||
  (s.externalIdType === ExternalIdType.COMPANY ? s.externalId : undefined);

// Read the first value of an errand parameter by key.
export const getErrandParameterValue = (parameters: CParameter[] | undefined, key: string): string =>
  parameters?.find((parameter) => parameter.key === key)?.values?.[0] ?? '';

// Set (or replace) an errand parameter by key while keeping the other parameters intact.
// An empty value removes the parameter so we don't persist blank entries.
export const upsertErrandParameter = (
  parameters: CParameter[] = [],
  key: string,
  value: string,
  displayName?: string
): CParameter[] => {
  const otherParameters = parameters.filter((parameter) => parameter.key !== key);
  if (!value?.trim()) {
    return otherParameters;
  }
  return [...otherParameters, { key, displayName, values: [value] }];
};

export const mapApiSupportErrandToSupportErrand: (e: ApiSupportErrand) => SupportErrand = (e) => {
  try {
    const ierrand: SupportErrand = {
      ...e,
      category: (e.classification?.category === 'NONE' ? '' : e.classification?.category) || '',
      type: (e.classification?.type === 'NONE' ? '' : e.classification?.type) || '',
      subType:
        (shouldMapLabelSubType(appConfig.features.useThreeLevelCategorization)
          ? (() => {
              const subTypeLabel = getMappedLabelSubType(e);
              return subTypeLabel?.resourcePath || subTypeLabel?.resourceName;
            })()
          : undefined) || '',
      contactReason: e.contactReason,
      contactReasonDescription: e.contactReasonDescription,
      businessRelated: e.businessRelated,
      labels: e.labels || [],
      caseId: e.externalTags?.find((t) => t.key === 'caseId')?.value,
      description: sanitized(e?.description ?? ''),
      customer: (e.stakeholders
        ?.filter((s) => s.role === 'PRIMARY')
        ?.map((s) => ({
          ...s,
          // TODO Remove s.firstName when the API is updated with dedicated field for organization name
          organizationName: s.organizationName || s.firstName || '',
          stakeholderType: mapExternalIdTypeToStakeholderType(s),
          username: s.parameters?.find((p) => p.key === 'username')?.values?.[0],
          administrationCode: s.parameters?.find((p) => p.key === 'administrationCode')?.values?.[0],
          administrationName: s.parameters?.find((p) => p.key === 'administrationName')?.values?.[0],
          title: s.parameters?.find((p) => p.key === 'title')?.values?.[0],
          referenceNumber: s.parameters?.find((p) => p.key === 'referenceNumber')?.values?.[0],
          department: s.parameters?.find((p) => p.key === 'department')?.values?.[0],
          organizationNumber: getStakeholderOrganizationNumber(s),
          newRole: 'PRIMARY',
          internalId: uuidv4(),
          emails: (s.contactChannels ?? [])
            .filter((c) => c.type === ContactChannelType.EMAIL || c.type === ContactChannelType.Email)
            .map((c) => ({ value: c.value })),
          phoneNumbers: (s.contactChannels ?? [])
            .filter((c) => c.type === ContactChannelType.PHONE || c.type === ContactChannelType.Phone)
            .map((c) => ({ value: c.value })),
        })) ?? []) as SupportStakeholderFormModel[],
      contacts: (e.stakeholders
        ?.filter((s) => s.role !== 'PRIMARY')
        ?.map((s) => ({
          ...s,
          // TODO Remove s.firstName when the API is updated with dedicated field for organization name
          organizationName: s.organizationName || s.firstName || '',
          stakeholderType: mapExternalIdTypeToStakeholderType(s),
          username: s.parameters?.find((p) => p.key === 'username')?.values?.[0],
          administrationCode: s.parameters?.find((p) => p.key === 'administrationCode')?.values?.[0],
          administrationName: s.parameters?.find((p) => p.key === 'administrationName')?.values?.[0],
          title: s.parameters?.find((p) => p.key === 'title')?.values?.[0],
          referenceNumber: s.parameters?.find((p) => p.key === 'referenceNumber')?.values?.[0],
          department: s.parameters?.find((p) => p.key === 'department')?.values?.[0],
          organizationNumber: getStakeholderOrganizationNumber(s),
          newRole: s.role as string,
          internalId: uuidv4(),
          emails: (s.contactChannels ?? [])
            .filter((c) => c.type === ContactChannelType.EMAIL || c.type === ContactChannelType.Email)
            .map((c) => ({ value: c.value })),
          phoneNumbers: (s.contactChannels ?? [])
            .filter((c) => c.type === ContactChannelType.PHONE || c.type === ContactChannelType.Phone)
            .map((c) => ({ value: c.value })),
        })) ?? []) as SupportStakeholderFormModel[],
    };
    return ierrand;
  } catch (e) {
    console.error('Error: could not map errands.', e);
    throw e;
  }
};

export const handleErrandResponse: (res: ApiSupportErrand[]) => SupportErrand[] = (res) => {
  const errands = res.map(mapApiSupportErrandToSupportErrand);
  return errands;
};

export const getSupportErrands: (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: SupportErrandFilterQuery,
  sort?: SupportErrandSortQuery
) => Promise<SupportErrandsData> = (municipalityId, page = 0, size = 10, filter = {}, sort = { modified: 'desc' }) => {
  if (!municipalityId) {
    return Promise.reject('Municipality id missing');
  }
  const query = buildSupportErrandsSearchParameters(page, size, filter, sort);
  const url = `supporterrands/${municipalityId}?${query}`;
  return apiService
    .get<PagedApiSupportErrands>(url)
    .then((res) => {
      const response = {
        errands: handleErrandResponse(res.data.content),
        page: res.data.pageable.pageNumber,
        size: res.data.pageable.pageSize,
        totalPages: res.data.totalPages,
        totalElements: res.data.totalElements,
        labels: [],
      } as SupportErrandsData;
      return response;
    })
    .catch((e) => {
      console.error('Error: could not fetch errands.', e);
      return { errands: [], labels: [], error: e.response?.status ?? 'UNKNOWN ERROR' } as SupportErrandsData;
    });
};

export const getSupportErrandsCount: (municipalityId: string, filter?: SupportErrandFilterQuery) => Promise<any> = (
  municipalityId,
  filter = {}
) => {
  if (!municipalityId) {
    return Promise.reject('Municipality id missing');
  }
  const query = buildSupportErrandsCountSearchParameters(filter);
  const url = `countsupporterrands/${municipalityId}?${query}`;
  return apiService
    .get<any>(url)
    .then((res) => {
      return res.data.count;
    })
    .catch((e): null => {
      return null;
    });
};

export const initiateSupportErrand: (municipalityId: string) => Promise<any | Partial<SupportErrandDto>> = (
  municipalityId
) => {
  return apiService
    .post<ApiSupportErrand, Partial<SupportErrandDto>>(`newerrand/${municipalityId}`, {})
    .then((res) => {
      return mapApiSupportErrandToSupportErrand(res.data);
    })
    .catch((e) => {
      console.error('Something went wrong when initiating errand');
      throw e;
    });
};

interface UpdateResponse {
  notes: boolean;
  attachments: boolean;
  errand: ApiSupportErrand | boolean;
}

export const updateSupportErrand: (
  municipalityId: string,
  formdata: Partial<RegisterSupportErrandFormModel>
) => Promise<UpdateResponse> = async (municipalityId, formdata) => {
  if (!formdata.id) {
    throw new Error('A support errand id is required before writing');
  }
  const errandId = formdata.id;
  const ifMatch = toStrongSupportErrandETag(formdata.version);
  const stakeholders = buildStakeholdersList(formdata);
  const data = buildSupportErrandUpdateData(formdata, stakeholders);
  const responseObj: UpdateResponse = {
    notes: false,
    attachments: false,
    errand: false,
  };

  try {
    await apiService.patch<ApiSupportErrand, Partial<SupportErrandDto>>(
      `supporterrands/${municipalityId}/${errandId}`,
      data,
      { headers: { 'If-Match': ifMatch } }
    );
    responseObj.errand = true;
  } catch (e) {
    console.error('Something went wrong when patching errand');
    throw e;
  }

  if (formdata.notes) {
    try {
      const noteRes = await saveSupportNote(errandId, municipalityId, formdata.notes);
      responseObj.notes = noteRes;
    } catch (e) {
      responseObj.notes = false;
    }
  } else {
    responseObj.notes = true;
  }

  if (formdata.attachments && formdata.attachments.length > 0) {
    try {
      const attachmentRes = await saveSupportAttachments(
        errandId,
        municipalityId,
        formdata.attachments as { file: File }[]
      );
      responseObj.attachments = attachmentRes.every((r) => r.status === 'fulfilled');
    } catch (e) {
      responseObj.attachments = false;
    }
  } else {
    responseObj.attachments = true;
  }

  if (!responseObj.notes || !responseObj.attachments) {
    const failedChildren = [!responseObj.notes && 'note', !responseObj.attachments && 'attachments']
      .filter(Boolean)
      .join(' and ');
    throw new Error(`Support errand was updated, but ${failedChildren} could not be saved`);
  }

  return responseObj;
};

export const updateSupportErrandPhase = (
  municipalityId: string,
  id: string,
  transitionId: string,
  expectedVersion: number
): Promise<SupportErrand> =>
  apiService
    .patch<ApiSupportErrand, { transitionId: string; expectedVersion: number }>(
      `supporterrands/${municipalityId}/${id}/phase`,
      { transitionId, expectedVersion }
    )
    .then((response) => mapApiSupportErrandToSupportErrand(response.data))
    .catch((e) => {
      console.error('Something went wrong when updating errand phase');
      throw e;
    });

export const getStatus: (errand: SupportErrand) => Status = (errand) => errand.status as Status;

export const validateAction: (errand: SupportErrand, user: User) => boolean = (errand, user) => {
  let allowed = false;
  if (user.username.toLocaleLowerCase() === errand?.assignedUserId?.toLocaleLowerCase()) {
    allowed = true;
  }
  return allowed;
};

export const setSupportErrandAdmin: (
  errandId: string,
  municipalityId: string,
  assignedUserId: string,
  status?: Status,
  assigner?: string
) => Promise<boolean> = async (errandId, municipalityId, assignedUserId, status?, assigner?) => {
  const data = { assignedUserId };

  try {
    const current = await apiService.get<ApiSupportErrand>(`supporterrands/${municipalityId}/${errandId}`);
    const ifMatch = toStrongSupportErrandETag(current.data.version);
    await apiService.patch<ApiSupportErrand, typeof data>(`supporterrands/${municipalityId}/${errandId}/admin`, data, {
      headers: { 'If-Match': ifMatch },
    });
    return status === undefined ? true : transitionSupportErrandStatus(errandId, municipalityId, status);
  } catch (e) {
    console.error('Something went wrong when patching errand');
    throw e;
  }
};

const transitionSupportErrandStatus = async (
  errandId: string,
  municipalityId: string,
  status: Status,
  changes: SupportErrandStatusTransitionChanges = {}
): Promise<boolean> => {
  const current = await apiService.get<ApiSupportErrand>(`supporterrands/${municipalityId}/${errandId}`);
  const command = buildSupportErrandStatusTransitionRequest(current.data, status, changes);
  await apiService.patch<ApiSupportErrand, SupportErrandStatusTransitionRequest>(
    `supporterrands/${municipalityId}/${errandId}/status`,
    command
  );
  return true;
};

export const setSupportErrandStatus: (
  errandId: string,
  municipalityId: string,
  status: Status
) => Promise<boolean> = async (errandId, municipalityId, status) => {
  return transitionSupportErrandStatus(errandId, municipalityId, status, {
    suspension: { suspendedFrom: undefined, suspendedTo: undefined },
  }).catch((e) => {
    console.error('Something went wrong when patching errand');
    throw e;
  });
};

export const closeSupportErrand: (
  errandId: string,
  municipalityId: string,
  resolution: Resolution
) => Promise<boolean> = async (errandId, municipalityId, resolution) => {
  return transitionSupportErrandStatus(errandId, municipalityId, Status.SOLVED, { resolution }).catch((e) => {
    console.error('Something went wrong when patching errand');
    throw e;
  });
};

export const setSuspension: (
  errandId: string,
  municipalityId: string,
  status: Status,
  date: string,
  comment: string
) => Promise<boolean> = async (errandId, municipalityId, status, date, comment) => {
  if (status === Status.SUSPENDED && (date === '' || dayjs().isAfter(dayjs(date)))) {
    return Promise.reject('Invalid date');
  }
  const suspension = {
    suspendedFrom: status === Status.SUSPENDED ? dayjs().toISOString() : undefined,
    suspendedTo: status === Status.SUSPENDED ? dayjs(date).set('hour', 7).toISOString() : undefined,
  };

  return transitionSupportErrandStatus(errandId, municipalityId, status, {
    suspension: {
      ...suspension,
    },
  })
    .then(async () => {
      if (status === Status.SUSPENDED && comment) {
        await saveSupportNote(errandId, municipalityId, comment);
      }
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when suspending errand');
      throw e;
    });
};

export const setSupportErrandPriority: (
  errandId: string,
  municipalityId: string,
  priority: Priority,
  expectedVersion: number
) => Promise<boolean> = async (errandId, municipalityId, priority, expectedVersion) => {
  const data: Partial<SupportErrandDto> = { priority };
  const ifMatch = toStrongSupportErrandETag(expectedVersion);

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}`, data, {
      headers: { 'If-Match': ifMatch },
    })
    .then(() => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when patching errand');
      throw e;
    });
};

export const forwardSupportErrand: (
  user: User,
  errand: SupportErrand,
  municipalityId: string,
  data: ForwardFormProps,
  supportAttachment: SupportAttachment[]
) => Promise<boolean> = async (user, errand, municipalityId, data, supportAttachment) => {
  if (!errand.id) {
    throw 'No errand id found. Cannot forward errand without id.';
  }
  if (!data.recipient) {
    throw 'No recipient found. Cannot forward errand without recipient.';
  }
  if (!data.message) {
    throw 'No message found. Cannot forward errand without message.';
  }

  // The errand is closed when it's forwarded. If it has no handler (e.g. forwarded directly
  // from status NEW), assign the current user so the errand always has a responsible person.
  const assignSelfIfUnassigned = async () => {
    if (!errand.assignedUserId) {
      await setSupportErrandAdmin(errand.id!, municipalityId, user.username, undefined, user.username);
    }
  };

  let attachmentId = [] as string[];
  for (const att of supportAttachment) {
    attachmentId.push(att.id);
  }

  if (data.recipient == 'EMAIL') {
    const message: MessageRequest = {
      municipalityId: municipalityId,
      errandId: errand.id,
      contactMeans: 'email',
      recipientEmail: '',
      headerReplyTo: '',
      headerReferences: '',
      emails: data.emails,
      subject: `Överlämnat ärende #${errand.errandNumber} ${errand.channel === 'EMAIL' ? `- "${errand.title}"` : ''}`,
      htmlMessage: data.message,
      plaintextMessage: data.messageBodyPlaintext,
      senderName: user.name,
      phoneNumbers: [],
      attachments: [],
      existingAttachments: [],
      attachmentIds: attachmentId,
    };
    if (isKC()) {
      message.senderName = 'Kontakt  Sundsvall';
    }
    await sendMessage(message);
    await assignSelfIfUnassigned();
    return closeSupportErrand(errand.id, municipalityId, Resolution.REGISTERED_EXTERNAL_SYSTEM);
  } else if (data.recipient == 'DEPARTMENT' && data.department) {
    errand.stakeholders?.forEach((s) => {
      if (!s.firstName && !s.organizationName) {
        throw new Error('MISSING_NAME');
      }
    });
    delete data.existingEmail;
    delete data.newEmail;
    return apiService
      .post<ApiSupportErrand, Partial<ForwardFormProps>>(`supporterrands/${municipalityId}/${errand.id!}/forward`, data)
      .then(async () => {
        await assignSelfIfUnassigned();
        return closeSupportErrand(errand.id!, municipalityId, Resolution.REGISTERED_EXTERNAL_SYSTEM);
      })
      .catch((e: AxiosError) => {
        throw new Error(e.response?.data as string);
      });
  } else {
    throw new Error('Not implemented yet');
  }
};

export const requestInfo: (
  user: User,
  errand: SupportErrand,
  municipalityId: string,
  data: RequestInfo,
  supportAttachment: SupportAttachment[]
) => Promise<boolean> = async (user, errand, municipalityId, data, supportAttachment) => {
  if (!errand.id) {
    throw 'No errand id found. Cannot request info without id.';
  }
  if (!data.contactMeans) {
    throw 'No contact means found. Cannot request info without contact means.';
  }
  if (!data.message) {
    throw 'No message found. Cannot request info without message.';
  }

  let attachmentId = [] as string[];
  for (const att of supportAttachment) {
    attachmentId.push(att.id);
  }

  const message: MessageRequest = {
    municipalityId: municipalityId,
    errandId: errand.id,
    contactMeans: data.contactMeans,
    recipientEmail: data.email,
    headerReplyTo: '',
    headerReferences: '',
    emails: data.contactMeans == 'email' ? [{ value: data.email }] : [],
    subject: `Ärende #${errand.errandNumber} - du behöver komplettera informationen`,
    htmlMessage: data.message,
    plaintextMessage: data.messageBodyPlaintext,
    senderName: user.name,
    phoneNumbers: data.contactMeans == 'sms' ? [{ value: data.phone }] : [],
    attachments: [],
    existingAttachments: [],
    attachmentIds: attachmentId,
  };
  const sendSuccess = await sendMessage(message);
  if (!sendSuccess) {
    throw new Error('SENDING_FAILED');
  }
  return setSupportErrandStatus(errand.id, municipalityId, Status.PENDING);
};

export const requestInternal: (
  user: User,
  errand: SupportErrand,
  municipalityId: string,
  data: RequestInfo,
  supportAttachment: SupportAttachment[],
  title: string
) => Promise<boolean> = async (user, errand, municipalityId, data, supportAttachment, title) => {
  if (!errand.id) {
    throw 'No errand id found. Cannot request info without id.';
  }
  if (!data.contactMeans) {
    throw 'No contact means found. Cannot request info without contact means.';
  }
  if (!data.message) {
    throw 'No message found. Cannot request info without message.';
  }

  let attachmentId = [] as string[];
  for (const att of supportAttachment) {
    attachmentId.push(att.id);
  }

  const message: MessageRequest = {
    municipalityId: municipalityId,
    errandId: errand.id,
    contactMeans: data.contactMeans,
    recipientEmail: data.email,
    headerReplyTo: '',
    headerReferences: '',
    emails: data.contactMeans == 'email' ? [{ value: data.email }] : [],
    subject: `Ärende #${errand.errandNumber} - ${title} Behöver din återkoppling`,
    htmlMessage: data.message,
    plaintextMessage: data.messageBodyPlaintext,
    senderName: user.name,
    phoneNumbers: data.contactMeans == 'sms' ? [{ value: data.phone }] : [],
    attachments: [],
    existingAttachments: [],
    attachmentIds: attachmentId,
  };
  const sendSuccess = await sendMessage(message);
  if (!sendSuccess) {
    throw new Error('SENDING_FAILED');
  }
  return setSupportErrandStatus(errand.id, municipalityId, Status.AWAITING_INTERNAL_RESPONSE);
};
