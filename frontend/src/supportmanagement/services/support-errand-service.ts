import { Label, Stakeholder as SupportStakeholder } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { apiService, Data } from '@common/services/api-service';
import { isKC } from '@common/services/application-service';
import { useAppContext } from '@contexts/app.context';
import { useSnackbar } from '@sk-web-gui/react';
import { ForwardFormProps } from '@supportmanagement/components/support-errand/sidebar/forward-errand.component';
import { RequestInfoFormProps } from '@supportmanagement/components/support-errand/sidebar/request-info.component';
import { ApiPagingData, RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { All, Priority } from '@supportmanagement/interfaces/priority';
import { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { useCallback, useEffect } from 'react';
import { SupportErrandDto } from 'src/data-contracts/backend/data-contracts';
import { v4 as uuidv4 } from 'uuid';
import { MAX_FILE_SIZE_MB, saveSupportAttachments, SupportAttachment } from './support-attachment-service';
import { MessageRequest, sendMessage } from './support-message-service';
import { SupportMetadata } from './support-metadata-service';
import { saveSupportNote } from './support-note-service';
import { buildStakeholdersList, mapExternalIdTypeToStakeholderType } from './support-stakeholder-service';
import store from '@supportmanagement/services/storage-service';

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

// Define a type based on the enum values
export type SupportStakeholderType = keyof typeof SupportStakeholderTypeEnum;

export type ExternalTags = Array<{ key: string; value: string }>;

export interface ApiSupportErrand extends SupportErrandDto {
  id?: string;
  created?: string;
  modified?: string;
  touched?: string;
}

export interface SupportErrand extends ApiSupportErrand {
  caseId?: string;
  category: string;
  type: string;
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
  labels: { label: string; screenReaderOnly: boolean; sortable: boolean; sticky?: boolean; shownForStatus: All }[];
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
}

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
}

export enum StatusLabel {
  NEW = 'Inkommet',
  ONGOING = 'Pågående',
  PENDING = 'Komplettering',
  SUSPENDED = 'Parkerat',
  ASSIGNED = 'Tilldelat',
  SOLVED = 'Löst',
  AWAITING_INTERNAL_RESPONSE = 'Intern återkoppling',
}

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

export const ongoingStatuses = [Status.ONGOING, Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE];

export const suspendedStatuses = [Status.SUSPENDED];
export const assignedStatuses = [Status.ASSIGNED];

export const closedStatuses = [Status.SOLVED];

export const getStatusLabel = (statuses: Status[]) => {
  if (statuses.length > 0) {
    if (statuses.some((s) => newStatuses.includes(s))) {
      return 'Nya ärenden';
    } else if (statuses.some((s) => ongoingStatuses.includes(s))) {
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

export const findStatusKeyForStatusLabel = (statusKey: string) =>
  Object.entries(StatusLabel).find((e: [string, string]) => e[1] === statusKey)?.[0];

export const findStatusLabelForStatusKey = (statusLabel: string) =>
  Object.entries(StatusLabel).find((e: [string, string]) => e[0] === statusLabel)?.[1];

export const findPriorityKeyForPriorityLabel = (priorityKey: string) =>
  Object.entries(Priority).find((e: [string, string]) => e[1] === priorityKey)?.[0];

export const findPriorityLabelForPriorityKey = (priorityLabel: string) =>
  Object.entries(Priority).find((e: [string, string]) => e[0] === priorityLabel)?.[1];

export const findAttestationStatusKeyForAttestationStatusLabel = (attestationStatusKey: string) =>
  Object.entries(AttestationStatusLabel).find((e: [string, string]) => e[1] === attestationStatusKey)?.[0];

export const findAttestationStatusLabelForAttestationStatusKey = (attestationStatusLabel: string) =>
  Object.entries(AttestationStatusLabel).find((e: [string, string]) => e[0] === attestationStatusLabel)?.[1];

export const getLabelCategory = (errand: SupportErrand, metadata: SupportMetadata) =>
  errand.labels.length !== 0
    ? metadata?.labels.labelStructure.find((c) => errand.labels.includes(c.name))
    : metadata?.labels.labelStructure.find((c) => errand.classification.category === c.name);

export const getLabelType = (errand: SupportErrand, metadata: SupportMetadata) => {
  const types = getLabelCategory(errand, metadata)?.labels;
  const subTypes = types?.find((x) => errand.labels.includes(x.name))?.labels;
  const matchingType = types?.find((t) => errand.labels.includes(t.name));
  if (matchingType) {
    return matchingType;
  }
  return types?.find((t) => t.name === errand.classification?.type);
};

export const getLabelSubType = (errand: SupportErrand, metadata: SupportMetadata) => {
  const types = getLabelCategory(errand, metadata)?.labels;
  const subTypes = types?.find((x) => errand.labels.includes(x.name))?.labels;
  const matchingSubType = subTypes?.find((s) => errand.labels.includes(s.name));
  return matchingSubType;
};

export const getLabelTypeFromDisplayName = (displayName: string, metadata: SupportMetadata): Label[] => {
  const allTypesFlattened = metadata?.labels?.labelStructure?.map((l) => l.labels).flat();
  return allTypesFlattened?.filter((t) => t.displayName === displayName);
};

export const getLabelTypeFromName = (name: string, metadata: SupportMetadata): Label => {
  const allTypesFlattened = metadata?.labels?.labelStructure?.map((l) => l.labels).flat();
  return allTypesFlattened?.find((t) => t.name === name);
};

export const getLabelSubTypeFromName = (name: string, metadata: SupportMetadata): Label => {
  const allTypesFlattened = metadata?.labels?.labelStructure?.map((l) => l.labels).flat();
  const allSubTypesFlattened =
    allTypesFlattened
      ?.filter((l) => l.labels?.length > 0)
      ?.map((l) => l.labels)
      ?.flat() || [];
  return allSubTypesFlattened?.find((t) => t.name === name);
};

// This might be instance specific in the future, meaning
// it will need to be configurable
export const ongoingStatusesLabels = 'Inkommet,Pågående,Parkerat';
export const ongoingStatusKeys = ongoingStatusesLabels.split(',').map(findStatusKeyForStatusLabel).join(',');

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
}

export enum ResolutionLabelLOP {
  CLOSED = 'Avslutat',
  BACK_TO_MANAGER = 'Åter till chef',
  BACK_TO_HR = 'Åter till HR',
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
}

export enum ResolutionLabelKA {
  SOLVED = 'Löst av Kontaktcenter',
  REGISTERED_EXTERNAL_SYSTEM = 'Vidarebefordrad (ärendet har eskalerats till annan funktion)',
}

export const ongoingSupportErrandLabelsKC = [
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Senaste aktivitet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Verksamhet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Inkom via', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Registrerades', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  {
    label: 'Prioritet',
    screenReaderOnly: false,
    sortable: true,
    shownForStatus: [Status.NEW, Status.ONGOING, Status.PENDING, Status.SOLVED, Status.SUSPENDED, Status.ASSIGNED],
  },
  { label: 'Påminnelse', screenReaderOnly: false, sortable: true, shownForStatus: [Status.SUSPENDED] },
  { label: 'Ansvarig', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
];

export const ongoingSupportErrandLabelsLoP = [
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Senaste aktivitet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Verksamhet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendekategori', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Inkom via', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Registrerades', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  {
    label: 'Prioritet',
    screenReaderOnly: false,
    sortable: true,
    shownForStatus: [Status.NEW, Status.ONGOING, Status.PENDING, Status.SOLVED, Status.SUSPENDED, Status.ASSIGNED],
  },
  {
    label: 'Påminnelse',
    screenReaderOnly: false,
    sortable: true,
    shownForStatus: [Status.SUSPENDED],
  },
  {
    label: 'Ansvarig',
    screenReaderOnly: false,
    sortable: true,
    shownForStatus: All.ALL,
  },
];

export const getOngoingSupportErrandLabels = (statuses: Status[]) => {
  const ongoingSupportErrandLabels = isKC() ? ongoingSupportErrandLabelsKC : ongoingSupportErrandLabelsLoP;
  return ongoingSupportErrandLabels.filter(
    (label) => label.shownForStatus === All.ALL || statuses?.some((status) => label.shownForStatus.includes(status))
  );
};

export interface SupportStakeholderFormModel extends SupportStakeholder {
  stakeholderType: SupportStakeholderType;
  internalId: string;
  organizationNumber?: string;
  personId?: string;
  personNumber?: string;
  emails: { value: string }[];
  phoneNumbers: { value: string }[];
  username?: string;
  administrationCode?: string;
  administrationName?: string;
}

export const emptyContact: SupportStakeholderFormModel = {
  stakeholderType: SupportStakeholderTypeEnum.PERSON,
  internalId: '',
  externalId: '',
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
  channel: ContactChannelType.PHONE,
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
};

export const isSupportErrandLocked: (errand: SupportErrand) => boolean = (errand) => {
  return errand?.status === Status.SOLVED || errand?.status === Status.SUSPENDED || errand?.status === Status.ASSIGNED;
};

export const useSupportErrands = (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: { [key: string]: string | boolean | number },
  sort?: { [key: string]: 'asc' | 'desc' },
  extraParameters?: { [key: string]: string }
): SupportErrandsData => {
  const toastMessage = useSnackbar();
  const {
    setIsLoading,
    setSupportErrands,
    supportErrands,
    setNewSupportErrands,
    newSupportErrands,
    setOngoingSupportErrands,
    ongoingSupportErrands,
    setSuspendedSupportErrands,
    suspendedSupportErrands,
    setAssignedSupportErrands,
    assignedSupportErrands,
    setSolvedSupportErrands,
    solvedSupportErrands,
  } = useAppContext();

  const unparsedStoredFilter = store.get('filter');
  const storedFilter = unparsedStoredFilter ? JSON.parse(unparsedStoredFilter) : {};

  const fetchErrands = useCallback(
    async (page: number = 0) => {
      setIsLoading(true);
      await getSupportErrands(municipalityId, page, size, filter, sort)
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
        getSupportErrands(
          municipalityId,
          page,
          // storedFilter.status === 'NEW' ? size : 1,
          1,
          { ...filter, status: Status.NEW },
          sort
        )
          .then((res) => {
            setNewSupportErrands(res);
          })
          .catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Nya ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrands(
          municipalityId,
          page,
          // storedFilter.status === 'ONGOING,PENDING,AWAITING_INTERNAL_RESPONSE' ? size : 1,
          1,
          { ...filter, status: `${Status.ONGOING},${Status.PENDING},${Status.AWAITING_INTERNAL_RESPONSE}` },
          sort
        )
          .then((res) => {
            setOngoingSupportErrands(res);
          })
          .catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Pågående ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrands(
          municipalityId,
          page,
          // storedFilter.status === 'SUSPENDED' ? size : 1,
          1,
          { ...filter, status: `${Status.SUSPENDED}` },
          sort
        )
          .then((res) => {
            if (res.error) {
              throw new Error('Error occurred when fetching errands');
            }
            setSuspendedSupportErrands(res);
          })
          .catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Parkerade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrands(
          municipalityId,
          page,
          // storedFilter.status === 'ASSIGNED' ? size : 1,
          1,
          { ...filter, status: `${Status.ASSIGNED}` },
          sort
        )
          .then((res) => {
            if (res.error) {
              throw new Error('Error occurred when fetching errands');
            }
            setAssignedSupportErrands(res);
          })
          .catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Tilldelade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getSupportErrands(
          municipalityId,
          page,
          // storedFilter.status === 'SOLVED' ? size : 1,
          1,
          { ...filter, status: Status.SOLVED },
          sort
        )
          .then((res) => {
            setSolvedSupportErrands(res);
          })
          .catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Avslutade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),
      ];
      return Promise.allSettled(sidebarUpdatePromises);
    },
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
  }, [filter, size, sort]);

  useEffect(() => {
    if (page !== supportErrands.page) {
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
        ({ errand: undefined, error: e.response?.status ?? 'UNKNOWN ERROR' } as {
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

export const mapApiSupportErrandToSupportErrand: (e: ApiSupportErrand) => SupportErrand = (e) => {
  try {
    const ierrand: SupportErrand = {
      ...e,
      category: e.classification?.category === 'NONE' ? undefined : e.classification?.category,
      type: e.classification?.type === 'NONE' ? undefined : e.classification?.type,
      contactReason: e.contactReason,
      contactReasonDescription: e.contactReasonDescription,
      businessRelated: e.businessRelated,
      labels: e.labels || [],
      customer:
        e.stakeholders
          ?.filter((s) => s.role === 'PRIMARY')
          ?.map((s) => ({
            ...s,
            // TODO Remove s.firstName when the API is updated with dedicated field for organization name
            organizationName: s.organizationName || s.firstName,
            stakeholderType: mapExternalIdTypeToStakeholderType(s),
            username: s.parameters?.find((p) => p.key === 'username')?.values[0],
            administrationCode: s.parameters?.find((p) => p.key === 'administrationCode')?.values[0],
            administrationName: s.parameters?.find((p) => p.key === 'administrationName')?.values[0],
            newRole: 'PRIMARY',
            internalId: uuidv4(),
            emails: s.contactChannels
              .filter((c) => c.type === ContactChannelType.EMAIL || c.type === ContactChannelType.Email)
              .map((c) => ({ value: c.value })),
            phoneNumbers: s.contactChannels
              .filter((c) => c.type === ContactChannelType.PHONE || c.type === ContactChannelType.Phone)
              .map((c) => ({ value: c.value })),
          })) || [],
      contacts:
        e.stakeholders
          ?.filter((s) => s.role !== 'PRIMARY')
          ?.map((s) => ({
            ...s,
            // TODO Remove s.firstName when the API is updated with dedicated field for organization name
            organizationName: s.organizationName || s.firstName,
            stakeholderType: mapExternalIdTypeToStakeholderType(s),
            username: s.parameters?.find((p) => p.key === 'username')?.values[0],
            administrationCode: s.parameters?.find((p) => p.key === 'administrationCode')?.values[0],
            administrationName: s.parameters?.find((p) => p.key === 'administrationName')?.values[0],
            newRole: s.role as string,
            internalId: uuidv4(),
            emails: s.contactChannels
              .filter((c) => c.type === ContactChannelType.EMAIL || c.type === ContactChannelType.Email)
              .map((c) => ({ value: c.value })),
            phoneNumbers: s.contactChannels
              .filter((c) => c.type === ContactChannelType.PHONE || c.type === ContactChannelType.Phone)
              .map((c) => ({ value: c.value })),
          })) || [],
    };
    return ierrand;
  } catch (e) {
    console.error('Error: could not map errands.', e);
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
  filter?: { [key: string]: string | boolean | number },
  sort?: { [key: string]: 'asc' | 'desc' }
) => Promise<SupportErrandsData> = (municipalityId, page = 0, size = 10, filter = {}, sort = { modified: 'desc' }) => {
  if (!municipalityId) {
    return Promise.reject('Municipality id missing');
  }
  let url = `supporterrands/${municipalityId}?page=${page}&size=${size}`;
  const filterQuery = Object.keys(filter)
    .map((key) => key + '=' + filter[key])
    .join('&');
  const sortQuery = `${Object.keys(sort)
    .map((key) => `sort=${key}%2C${sort[key]}`)
    .join('&')}`;
  url = filterQuery ? `supporterrands/${municipalityId}?page=${page}&size=${size}&${filterQuery}` : url;
  url = sortQuery ? `${url}&${sortQuery}` : url;
  return apiService
    .get<PagedApiSupportErrands>(url)
    .then((res) => {
      const response = {
        errands: handleErrandResponse(res.data.content),
        page: res.data.pageable.pageNumber,
        size: res.data.pageable.pageSize,
        totalPages: res.data.totalPages,
        totalElements: res.data.totalElements,
        labels: isKC() ? ongoingSupportErrandLabelsKC : ongoingSupportErrandLabelsLoP,
      } as SupportErrandsData;
      return response;
    })
    .catch((e) => {
      return { errands: [], labels: [], error: e.response?.status ?? 'UNKNOWN ERROR' } as SupportErrandsData;
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

type AllSettledResponse = ({ status: 'fulfilled'; value: any } | { status: 'rejected'; reason: any })[];

export const updateSupportErrand: (
  municipalityId: string,
  formdata: Partial<RegisterSupportErrandFormModel>
) => Promise<UpdateResponse> = async (municipalityId, formdata) => {
  let responseObj: UpdateResponse = {
    notes: false,
    attachments: false,
    errand: false,
  };

  if (formdata.notes && formdata.id) {
    try {
      const noteRes = await saveSupportNote(formdata.id, municipalityId, formdata.notes);
      responseObj.notes = noteRes;
    } catch (e) {
      responseObj.notes = false;
    }
  } else {
    responseObj.notes = true;
  }

  if (formdata.attachments && formdata.attachments.length > 0) {
    try {
      const attachmentRes: AllSettledResponse = await saveSupportAttachments(
        formdata.id,
        municipalityId,
        formdata.attachments
      );
      responseObj.attachments = attachmentRes.every((r) => r.status === 'fulfilled');
    } catch (e) {
      responseObj.attachments = false;
    }
  } else {
    responseObj.attachments = true;
  }
  const stakeholders = buildStakeholdersList(formdata);

  const data: Partial<SupportErrandDto> = {
    ...(formdata.title && { title: formdata.title }),
    ...(formdata.priority && {
      priority: formdata.priority,
    }),
    classification: {
      ...(formdata.category && { category: formdata.category }),
      ...(formdata.type && { type: formdata.type }),
    },
    labels: formdata.labels,
    ...(formdata.contactReason && { contactReason: formdata.contactReason }),
    ...(formdata.contactReason &&
      typeof formdata.contactReasonDescription !== 'undefined' && {
        contactReasonDescription: formdata.contactReasonDescription,
      }),
    businessRelated: !!formdata.businessRelated,
    ...(formdata.status && { status: formdata.status }),
    ...(formdata.status && {
      suspension: {
        suspendedFrom: undefined,
        suspendedTo: undefined,
      },
    }),
    ...(formdata.resolution && { resolution: formdata.resolution }),
    ...(formdata.escalationEmail && { escalationEmail: formdata.escalationEmail }),
    ...(formdata.channel && { channel: formdata.channel }),
    ...(formdata.description && { description: formdata.description }),
    ...(formdata.assignedUserId && { assignedUserId: formdata.assignedUserId }),
    ...{ stakeholders: stakeholders },
    externalTags: formdata.externalTags || [],
  };
  if (formdata.caseId) {
    data.externalTags.push({
      key: 'caseId',
      value: formdata.caseId,
    });
  }

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${formdata.id}`, data)
    .then(() => {
      responseObj.errand = true;
      return responseObj;
    })
    .catch((e) => {
      console.error('Something went wrong when patching errand');
      throw e;
    });
};

export const getStatus: (errand: SupportErrand) => Status = (errand) => errand.status as Status;

export const validateAction: (errand: SupportErrand, user: User) => boolean = (errand, user) => {
  let allowed = false;
  if (user.username.toLocaleLowerCase() === errand?.assignedUserId?.toLocaleLowerCase()) {
    allowed = true;
  }
  return allowed;
};

export const blobToBase64: (blobl: Blob) => Promise<string> = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const saveSupportCroppedImage = async (errandId: number, attachment: SupportAttachment, _blob: Blob) => {
  if (!attachment?.id) {
    throw 'No attachment id found. Cannot save attachment without id.';
  }
  if (_blob.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
    throw new Error('MAX_SIZE');
  }
  const blob64 = await blobToBase64(_blob);
  const obj: SupportAttachment = {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
  };
  const buf = Buffer.from(obj.id, 'base64');
  const blob = new Blob([buf], { type: obj.mimeType });

  // Building form data
  const formData = new FormData();
  formData.append(`files`, blob, obj.id);
  formData.append(`name`, obj.fileName);
  formData.append(`mimeType`, obj.mimeType);
  const url = `casedata/errands/${errandId}/attachments/${attachment.id}`;
  return apiService
    .put<boolean, FormData>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when creating attachment ', obj.fileName);
      throw e;
    });
};

export const setSupportErrandAdmin: (
  errandId: string,
  municipalityId: string,
  assignedUserId: string,
  status?: Status,
  assigner?: string
) => Promise<boolean> = async (errandId, municipalityId, assignedUserId, status?, assigner?) => {
  const data: Partial<SupportErrandDto> = { assignedUserId, status };

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}/admin`, data)
    .then(() => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when patching errand');
      throw e;
    });
};

export const setSupportErrandStatus: (
  errandId: string,
  municipalityId: string,
  status: Status
) => Promise<boolean> = async (errandId, municipalityId, status) => {
  console.log('setSupportErrandStatus', errandId, municipalityId, status);
  const data: Partial<SupportErrandDto> = { status, suspension: { suspendedFrom: undefined, suspendedTo: undefined } };

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}`, data)
    .then(() => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when patching errand');
      throw e;
    });
};

export const closeSupportErrand: (
  errandId: string,
  municipalityId: string,
  resolution: Resolution
) => Promise<boolean> = async (errandId, municipalityId, resolution) => {
  const data: Partial<SupportErrandDto> = { status: Status.SOLVED, resolution };

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}`, data)
    .then(() => {
      return true;
    })
    .catch((e) => {
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
  const data: Partial<SupportErrandDto> = {
    status,
    suspension: {
      suspendedFrom: status === Status.SUSPENDED ? dayjs().toISOString() : undefined,
      suspendedTo: status === Status.SUSPENDED ? dayjs(date).set('hour', 7).toISOString() : undefined,
    },
  };

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}`, data)
    .then(async () => {
      if (status === Status.SUSPENDED && comment) {
        const note = await saveSupportNote(errandId, municipalityId, comment);
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
  priority: Priority
) => Promise<boolean> = async (errandId, municipalityId, priority) => {
  const data: Partial<SupportErrandDto> = { priority };

  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}`, data)
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
      subject: 'Vidarebefordran av ärende',
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
    return closeSupportErrand(errand.id, municipalityId, Resolution.REGISTERED_EXTERNAL_SYSTEM);
  } else if (data.recipient == 'DEPARTMENT' && data.department === 'MEX') {
    errand.stakeholders.forEach((s) => {
      if (!s.firstName && !s.organizationName) {
        throw new Error('MISSING_NAME');
      }
    });
    delete data.existingEmail;
    delete data.newEmail;
    return apiService
      .post<ApiSupportErrand, Partial<ForwardFormProps>>(`supporterrands/${municipalityId}/${errand.id}/forward`, data)
      .then(() => {
        return closeSupportErrand(errand.id, municipalityId, Resolution.REGISTERED_EXTERNAL_SYSTEM);
      })
      .catch((e: AxiosError) => {
        throw new Error(e.response.data as string);
      });
  } else {
    throw new Error('Not implemented yet');
  }
};

export const requestInfo: (
  user: User,
  errand: SupportErrand,
  municipalityId: string,
  data: RequestInfoFormProps,
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
  data: RequestInfoFormProps,
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
