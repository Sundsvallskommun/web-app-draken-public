import { Label, Stakeholder as SupportStakeholder } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { apiService, Data } from '@common/services/api-service';
import { isKC, isLOK } from '@common/services/application-service';
import sanitized from '@common/services/sanitizer-service';
import { appConfig } from '@config/appconfig';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import { ForwardFormProps } from '@supportmanagement/components/support-errand/sidebar/buttons/support-forward-errand-button.component';
import { ApiPagingData, RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { All, Priority } from '@supportmanagement/interfaces/priority';
import { basicsAcceptsClassification } from '@supportmanagement/investigation/investigation-classification-ownership';
import { getSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef } from 'react';
import { CParameter, SupportErrandDto } from 'src/data-contracts/backend/data-contracts';
import { v4 as uuidv4 } from 'uuid';

import { saveSupportAttachments, SupportAttachment } from './support-attachment-service';
import { isSupportErrandEmpty } from './support-errand-emptiness';
import type { SupportErrandFilterQuery, SupportErrandSortQuery } from './support-errand-query';
import { buildSupportErrandsCountSearchParameters, buildSupportErrandsSearchParameters } from './support-errand-query';
import {
  assignedStatuses,
  closedStatuses,
  newStatuses,
  Resolution,
  Status,
  suspendedStatuses,
} from './support-errand-status';
import {
  buildSupportErrandStatusTransitionRequest,
  SupportErrandStatusSnapshot,
  SupportErrandStatusTransitionChanges,
  SupportErrandStatusTransitionRequest,
} from './support-errand-status-transition';
import { buildSupportErrandUpdateData } from './support-errand-update-data';
import { SupportErrandStatusAfterAssignmentError, toStrongSupportErrandETag } from './support-errand-write-version';
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

// The status and resolution vocabulary lives in a dependency-free module so the errand policy and
// the dragon modules can import it without this file's React/store/HTTP dependencies. Re-exported
// here so existing importers keep working. Which statuses count as ongoing is deliberately not
// among them: read `getSupportErrandPolicy().ongoingStatuses`, which is the running dragon's list.
export {
  assignedStatuses,
  closedStatuses,
  newStatuses,
  Resolution,
  Status,
  suspendedStatuses,
} from './support-errand-status';

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

export const getStatusLabel = (statuses: readonly Status[]) => {
  if (statuses.length > 0) {
    if (statuses.some((s) => newStatuses.includes(s))) {
      return 'Nya ärenden';
    } else if (statuses.some((s) => getSupportErrandPolicy().ongoingStatuses.includes(s))) {
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
  getLabelReportType,
  getLabelSubType,
  getLabelSubTypeFromName,
  getLabelType,
  getLabelTypeFromName,
  getMappedLabelSubType,
} from './support-label-classification-service';

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

  // Each filter, sort or page change starts a new round of requests while the previous round may
  // still be in flight, and the responses can land in any order. Whichever lands last used to win,
  // so a slow earlier request overwrote the current one - and since the table only renders errands
  // whose status the sidebar has selected, a result fetched for another status renders as an empty
  // table next to a correct count. Only the newest round is allowed to write.
  const latestRequestRef = useRef(0);

  const fetchErrands = useCallback(
    async (page: number = 0) => {
      // An undefined filter means the overview has not composed one yet: fetching here would ask
      // for every errand regardless of status, which is both the most expensive query we can make
      // and the one most likely to come back last.
      if (!filter) {
        return;
      }
      const requestId = ++latestRequestRef.current;
      const isLatestRequest = () => latestRequestRef.current === requestId;

      setIsLoading(true);
      setNewSupportErrands(null);
      setOngoingSupportErrands(null);
      setSuspendedSupportErrands(null);
      setAssignedSupportErrands(null);
      setSolvedSupportErrands(null);
      setSupportErrands({ ...supportErrands, isLoading: true });

      const errandPromise = getSupportErrands(municipalityId, page, size, filter, sort)
        .then((res) => {
          if (!isLatestRequest()) return;
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
            if (!isLatestRequest()) return;
            setNewSupportErrands(res);
          })
          .catch(() => {
            if (!isLatestRequest()) return;
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
          status: getSupportErrandPolicy().ongoingStatuses.join(','),
        })
          .then((res) => {
            if (!isLatestRequest()) return;
            setOngoingSupportErrands(res);
          })
          .catch(() => {
            if (!isLatestRequest()) return;
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
            if (!isLatestRequest()) return;
            setSuspendedSupportErrands(res);
          })
          .catch(() => {
            if (!isLatestRequest()) return;
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
            if (!isLatestRequest()) return;
            setAssignedSupportErrands(res);
          })
          .catch(() => {
            if (!isLatestRequest()) return;
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
            if (!isLatestRequest()) return;
            setSolvedSupportErrands(res);
          })
          .catch(() => {
            if (!isLatestRequest()) return;
            setSolvedSupportErrands(0);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Avslutade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),
      ];

      await Promise.allSettled([errandPromise, ...sidebarUpdatePromises]);
      // A superseded round must not turn the loader off while the round that replaced it is still
      // running.
      if (isLatestRequest()) {
        setIsLoading(false);
      }
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
      fetchErrands();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, size, sort]);

  useEffect(() => {
    if (supportErrands.page !== undefined && page !== supportErrands.page) {
      fetchErrands(page);
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

export const supportErrandIsEmpty: (errand: SupportErrand) => boolean = (errand) =>
  isSupportErrandEmpty(errand, basicsAcceptsClassification());

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

/**
 * Writes the edited form back to the errand.
 *
 * `expectedVersion` is a required argument rather than a form field: form state is only reset
 * when the errand page loads, so any version carried in it is stale as soon as another action
 * has written to the errand. Pass the version of the errand currently in the store.
 */
export const updateSupportErrand: (
  municipalityId: string,
  formdata: Partial<RegisterSupportErrandFormModel>,
  expectedVersion: number | undefined
) => Promise<UpdateResponse> = async (municipalityId, formdata, expectedVersion) => {
  if (!formdata.id) {
    throw new Error('A support errand id is required before writing');
  }
  const errandId = formdata.id;
  const ifMatch = toStrongSupportErrandETag(expectedVersion);
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

/**
 * Reads the errand's current concurrency state from the API.
 *
 * Only for a write that follows one of *our own* writes in the same flow: that earlier write
 * already verified the version the user was looking at, so the version it produced is causally
 * ours and re-reading cannot mask someone else's edit. The first write in a flow must instead
 * pass the snapshot the view was loaded with - reading immediately before writing satisfies the
 * precondition without ever checking it, which is optimistic locking in name only.
 */
export const readSupportErrandWriteSnapshot = async (
  errandId: string,
  municipalityId: string
): Promise<SupportErrandStatusSnapshot> => {
  const current = await apiService.get<ApiSupportErrand>(`supporterrands/${municipalityId}/${errandId}`);

  return { status: current.data.status, version: current.data.version };
};

/**
 * `expectedVersion` is the version of the errand the caller was looking at. Pass the value from
 * the store, or from `readSupportErrandWriteSnapshot` when an earlier write in the same flow has
 * already moved it on.
 */
export const setSupportErrandAdmin: (
  errandId: string,
  municipalityId: string,
  assignedUserId: string,
  expectedVersion: number | undefined,
  status?: Status,
  assigner?: string
) => Promise<boolean> = async (errandId, municipalityId, assignedUserId, expectedVersion, status?, assigner?) => {
  const data = { assignedUserId };

  try {
    const ifMatch = toStrongSupportErrandETag(expectedVersion);
    await apiService.patch<ApiSupportErrand, typeof data>(`supporterrands/${municipalityId}/${errandId}/admin`, data, {
      headers: { 'If-Match': ifMatch },
    });
  } catch (e) {
    console.error('Something went wrong when patching errand');
    throw e;
  }

  if (status === undefined) return true;

  try {
    // The assignment above is ours and succeeded, so it is the write that moved the version on.
    const afterAssignment = await readSupportErrandWriteSnapshot(errandId, municipalityId);
    return await transitionSupportErrandStatus(errandId, municipalityId, status, afterAssignment);
  } catch (e) {
    // Reported apart from the assignment: that one landed, and an errand left in Ny needs a
    // different answer from the user than one that was never assigned at all.
    console.error('Support errand was assigned, but its status could not be changed');
    throw new SupportErrandStatusAfterAssignmentError(e);
  }
};

const transitionSupportErrandStatus = async (
  errandId: string,
  municipalityId: string,
  status: Status,
  expected: SupportErrandStatusSnapshot,
  changes: SupportErrandStatusTransitionChanges = {}
): Promise<boolean> => {
  const command = buildSupportErrandStatusTransitionRequest(expected, status, changes);
  await apiService.patch<ApiSupportErrand, SupportErrandStatusTransitionRequest>(
    `supporterrands/${municipalityId}/${errandId}/status`,
    command
  );
  return true;
};

export const setSupportErrandStatus: (
  errandId: string,
  municipalityId: string,
  status: Status,
  expected: SupportErrandStatusSnapshot
) => Promise<boolean> = async (errandId, municipalityId, status, expected) => {
  return transitionSupportErrandStatus(errandId, municipalityId, status, expected, {
    suspension: { suspendedFrom: undefined, suspendedTo: undefined },
  }).catch((e) => {
    console.error('Something went wrong when patching errand');
    throw e;
  });
};

export const closeSupportErrand: (
  errandId: string,
  municipalityId: string,
  resolution: Resolution,
  expected: SupportErrandStatusSnapshot
) => Promise<boolean> = async (errandId, municipalityId, resolution, expected) => {
  return transitionSupportErrandStatus(errandId, municipalityId, Status.SOLVED, expected, { resolution }).catch((e) => {
    console.error('Something went wrong when patching errand');
    throw e;
  });
};

export const setSuspension: (
  errandId: string,
  municipalityId: string,
  status: Status,
  date: string,
  comment: string,
  expected: SupportErrandStatusSnapshot
) => Promise<boolean> = async (errandId, municipalityId, status, date, comment, expected) => {
  if (status === Status.SUSPENDED && (date === '' || dayjs().isAfter(dayjs(date)))) {
    return Promise.reject('Invalid date');
  }
  const suspension = {
    suspendedFrom: status === Status.SUSPENDED ? dayjs().toISOString() : undefined,
    suspendedTo: status === Status.SUSPENDED ? dayjs(date).set('hour', 7).toISOString() : undefined,
  };

  return transitionSupportErrandStatus(errandId, municipalityId, status, expected, {
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
    if (errand.assignedUserId) return;
    // Follows the message or forward call above, so the loaded version may already be ours-but-stale.
    const current = await readSupportErrandWriteSnapshot(errand.id!, municipalityId);
    await setSupportErrandAdmin(errand.id!, municipalityId, user.username, current.version, undefined, user.username);
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
    const afterMessage = await readSupportErrandWriteSnapshot(errand.id, municipalityId);
    return closeSupportErrand(errand.id, municipalityId, Resolution.REGISTERED_EXTERNAL_SYSTEM, afterMessage);
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
        const afterForward = await readSupportErrandWriteSnapshot(errand.id!, municipalityId);
        return closeSupportErrand(errand.id!, municipalityId, Resolution.REGISTERED_EXTERNAL_SYSTEM, afterForward);
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
  // The message send above is ours, so the version the caller loaded may already have moved on.
  const afterMessage = await readSupportErrandWriteSnapshot(errand.id, municipalityId);
  return setSupportErrandStatus(errand.id, municipalityId, Status.PENDING, afterMessage);
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
  // The message send above is ours, so the version the caller loaded may already have moved on.
  const afterMessage = await readSupportErrandWriteSnapshot(errand.id, municipalityId);
  return setSupportErrandStatus(errand.id, municipalityId, Status.AWAITING_INTERNAL_RESPONSE, afterMessage);
};
