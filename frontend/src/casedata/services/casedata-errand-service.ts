import { CasedataFormModel } from '@casedata/components/errand/tabs/overview/casedata-form.component';
import { Attachment } from '@casedata/interfaces/attachment';
import { CaseLabels, FTCaseLabel, MEXCaseLabel, PTCaseLabel } from '@casedata/interfaces/case-label';
import { CaseTypes, FTCaseType, MEXCaseType, PTCaseType } from '@casedata/interfaces/case-type';
import { ApiChannels, Channels } from '@casedata/interfaces/channels';
import {
  ApiErrand,
  ErrandsData,
  IErrand,
  PagedApiErrandsResponse,
  RegisterErrandData,
  RelatedErrand,
} from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { All, ApiPriority, Priority } from '@casedata/interfaces/priority';
import {
  MAX_FILE_SIZE_MB,
  fetchErrandAttachments,
  validateAttachmentsForDecision,
} from '@casedata/services/casedata-attachment-service';
import {
  getLastUpdatedAdministrator,
  makeStakeholdersList,
  stakeholder2Contact,
} from '@casedata/services/casedata-stakeholder-service';

import { CreateErrandNoteDto } from '@casedata/interfaces/errandNote';
import { Role } from '@casedata/interfaces/role';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { User } from '@common/interfaces/user';
import { getApplicationEnvironment, isMEX, isPT } from '@common/services/application-service';
import { useAppContext } from '@contexts/app.context';
import { useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef } from 'react';
import { ApiResponse, apiService } from '../../common/services/api-service';
import { saveErrandNote } from './casedata-errand-notes-service';
import { replaceExtraParameter } from './casedata-extra-parameters-service';
import { v4 as uuidv4 } from 'uuid';

export const municipalityIds = [
  { label: 'Sundsvall', id: '2281' },
  { label: 'Timrå', id: '2262' },
  { label: 'Ånge', id: '2260' },
];

export const emptyMeaErrandList: ErrandsData = {
  errands: [],
  labels: [],
};

export const emptyErrandList: ErrandsData = {
  errands: [],
  labels: [],
};

export const ongoingCaseDataErrandLabels = [
  { label: 'Fast.bet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Senaste aktivitet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Prio', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Registrerat', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Handläggare', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
];

export const ongoingCaseDataPTErrandLabels = [
  { label: 'Status', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Senaste aktivitet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendenummer', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Prioritet', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendeägare', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Registrerat', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Handläggare', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
];

export const newStatuses = [ErrandStatus.ArendeInkommit];

export const ongoingStatuses = [
  ErrandStatus.UnderGranskning,
  ErrandStatus.VantarPaKomplettering,
  ErrandStatus.InterntAterkoppling,
  ErrandStatus.UnderUtredning,
  ErrandStatus.UnderBeslut,
  ErrandStatus.Beslutad,
  ErrandStatus.BeslutVerkstallt,
  ...(isPT() ? [ErrandStatus.BeslutOverklagat] : []),
];

export const suspendedStatuses = [ErrandStatus.Parkerad];
export const assignedStatuses = [ErrandStatus.Tilldelat];

export const closedStatuses = [
  ErrandStatus.ArendeAvslutat,
  ErrandStatus.ArendetAvvisas,
  ErrandStatus.HanterasIAnnatSystem,
];

export const getStatusLabel = (statuses: ErrandStatus[]) => {
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

export const isFTErrand = (errand: IErrand) => {
  return Object.values(FTCaseType).includes(errand.caseType as FTCaseType);
};

export const findPriorityKeyForPriorityLabel = (key: string) =>
  Object.entries(Priority).find((e: [string, string]) => e[1] === key)?.[0];

export const findStatusKeyForStatusLabel = (statusKey: string) =>
  Object.entries(ErrandStatus).find((e: [string, string]) => e[1] === statusKey)?.[0];

export const findStatusLabelForStatusKey = (statusLabel: string) =>
  Object.entries(ErrandStatus).find((e: [string, string]) => e[1] === statusLabel)?.[1] || statusLabel;

export const getCaseTypes = () => {
  const isTest = getApplicationEnvironment() === 'TEST';

  if (isPT()) {
    return isTest ? { ...PTCaseType, ...FTCaseType } : { ...PTCaseType };
  }

  if (isMEX()) {
    return MEXCaseType;
  }

  //Temporarily added to show all case types in test environment, this can later be changed to CaseTypes.ALL
  if (isTest) {
    return { ...PTCaseType, ...MEXCaseType, ...FTCaseType };
  }

  return { ...PTCaseType, ...MEXCaseType };
};

export const getCaseLabels = () => {
  const isTest = getApplicationEnvironment() === 'TEST';

  if (isPT()) {
    return isTest ? { ...PTCaseLabel, ...FTCaseLabel } : { ...PTCaseLabel };
  }

  if (isMEX()) {
    return MEXCaseLabel;
  }

  //Temporarily added to show all case lables in test environment, this can later be changed to CaseLables.ALL
  if (isTest) {
    return { ...PTCaseLabel, ...MEXCaseLabel, ...FTCaseLabel };
  }

  return { ...PTCaseLabel, ...MEXCaseLabel };
};

export const findCaseTypeForCaseLabel = (caseLabel: string) => {
  return Object.entries(getCaseLabels()).find((e: [string, string]) => e[1] === caseLabel)?.[0];
};

export const findCaseLabelForCaseType = (caseType: string) =>
  Object.entries(getCaseLabels()).find((e: [string, string]) => e[0] === caseType)?.[1];

export const isErrandClosed: (errand: IErrand | CasedataFormModel) => boolean = (errand) => {
  if (errand?.status && typeof errand?.status === 'object') {
    return errand?.status?.statusType === ErrandStatus.ArendeAvslutat;
  } else {
    return errand?.status === ErrandStatus.ArendeAvslutat;
  }
};

export const isErrandLocked: (errand: IErrand | CasedataFormModel) => boolean = (errand) => {
  if (errand?.status && typeof errand?.status === 'object') {
    return errand?.status?.statusType === ErrandStatus.ArendeAvslutat || phaseChangeInProgress(errand as IErrand);
  } else {
    return errand?.status === ErrandStatus.ArendeAvslutat;
  }
};

export const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case Priority.HIGH:
      return 'text-error-surface-primary';
    case Priority.MEDIUM:
      return 'text-warning-surface-primary';
    case Priority.LOW:
      return 'text-vattjom-surface-primary';
  }
};
const defaultMunicipality = municipalityIds.find((m) => m.label === 'Sundsvall');

export const emptyErrand: Partial<IErrand> = {
  caseType: '',
  channel: Channels.WEB_UI,
  description: '',
  municipalityId: defaultMunicipality.id,
  phase: ErrandPhase.aktualisering,
  priority: Priority.MEDIUM,
  status: { statusType: ErrandStatus.ArendeInkommit },
};

export const mapErrandToIErrand: (e: ApiErrand, municipalityId: string) => IErrand = (e, municipalityId) => {
  const administrator = getLastUpdatedAdministrator(e.stakeholders);
  try {
    const ierrand: IErrand = {
      id: e.id,
      externalCaseId: e.externalCaseId,
      errandNumber: e.errandNumber,
      caseType: e.caseType,
      label: findCaseLabelForCaseType(CaseTypes.ALL[e.caseType]),
      description: e.description || '',
      administrator: administrator,
      administratorName: administrator ? `${administrator.firstName} ${administrator.lastName}` : '',
      priority: Priority[e.priority as Priority],
      status: e.status,
      statuses: e.statuses,
      phase: e.phase,
      channel: e.channel ? Channels[e.channel] : Channels.WEB_UI,
      municipalityId: e.municipalityId || municipalityId,
      stakeholders: e.stakeholders.map(stakeholder2Contact),
      facilities: e.facilities,
      created: e.created ? dayjs(e.created).format('YYYY-MM-DD HH:mm') : '',
      updated: e.updated ? dayjs(e.updated).format('YYYY-MM-DD HH:mm') : '',
      notes: e.notes.sort((a, b) =>
        dayjs(a.updated).isAfter(dayjs(b.updated)) ? -1 : dayjs(b.updated).isAfter(dayjs(a.updated)) ? 1 : 0
      ),
      decisions: e.decisions,
      attachments: [],
      messageIds: [],
      extraParameters: e.extraParameters,
      suspension: {
        suspendedFrom: e.suspension?.suspendedFrom,
        suspendedTo: e.suspension?.suspendedTo,
      },

      notifications: e.notifications,
      relatesTo: e.relatesTo,
    };
    return ierrand;
  } catch (e) {
    console.error('Error: could not map errands.');
  }
};

export const handleErrandResponse: (res: ApiErrand[], municipalityId: string) => IErrand[] = (res, municipalityId) => {
  const errands = res.map((res) => mapErrandToIErrand(res, municipalityId));
  return errands;
};

export const getErrand: (municipalityId: string, id: string) => Promise<{ errand: IErrand; error?: string }> = (
  municipalityId,
  id
) => {
  let url = `casedata/${municipalityId}/errand/${id}`;
  return apiService
    .get<ApiResponse<ApiErrand>>(url)
    .then(async (res: any) => {
      const errand = mapErrandToIErrand(res.data.data, municipalityId);
      let error;
      const errandAttachments = await fetchErrandAttachments(municipalityId, errand.id);
      if (errandAttachments.message === 'error') {
        error = 'Ärendets bilagor kunde inte hämtas';
      }
      errand.attachments = errandAttachments.data;
      return { errand, ...(error && { error }) };
    })
    .catch(
      (e) =>
        ({ errand: undefined, error: e.response?.status ?? 'UNKNOWN ERROR' } as { errand: IErrand; error?: string })
    );
};

export const getErrandByErrandNumber: (
  municipalityId: string,
  errandNumber: string
) => Promise<{ errand: IErrand; error?: string }> = (municipalityId, errandNumber) => {
  let url = `casedata/${municipalityId}/errand/errandNumber/${errandNumber}`;
  return apiService
    .get<ApiResponse<ApiErrand>>(url)
    .then(async (res: any) => {
      const errand = mapErrandToIErrand(res.data.data, municipalityId);
      let error: string;
      const errandAttachments = await fetchErrandAttachments(municipalityId, errand.id);
      if (errandAttachments.message === 'error') {
        error = 'Ärendets bilagor kunde inte hämtas';
      }
      errand.attachments = errandAttachments.data;
      return { errand, ...(error && { error }) };
    })
    .catch((e) => ({ errand: undefined, error: 'Ärende kunde inte hämtas' } as { errand: IErrand; error?: string }));
};

export const getErrands: (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: { [key: string]: string | boolean | number },
  sort?: { [key: string]: 'asc' | 'desc' },
  extraParameters?: { [key: string]: string }
) => Promise<ErrandsData> = (
  municipalityId = process.env.NEXT_PUBLIC_MUNICIPALITY_ID,
  page = 0,
  size = 8,
  filter = {},
  sort = { updated: 'desc' },
  extraParameters = {}
) => {
  let url = `casedata/${municipalityId}/errands?page=${page}&size=${size}`;

  const filterQuery = Object.keys(filter)
    .map((key) => key + '=' + filter[key])
    .join('&');
  const sortQuery = `${Object.keys(sort)
    .map((key) => `sort=${key}%2C${sort[key]}`)
    .join('&')}`;

  const extraParametersQuery = Object.keys(extraParameters)
    .map((key) => key + '=' + extraParameters[key])
    .join('&');

  url = filterQuery ? `casedata/${municipalityId}/errands?page=${page}&size=${size}&${filterQuery}` : url;
  url = sortQuery ? `${url}&${sortQuery}` : url;
  url = extraParametersQuery ? `${url}&${extraParametersQuery}` : url;

  return apiService
    .get<ApiResponse<PagedApiErrandsResponse>>(url)
    .then((res: any) => {
      let response = {} as ErrandsData;
      const labels = isPT() ? ongoingCaseDataPTErrandLabels : ongoingCaseDataErrandLabels;
      response = {
        errands: handleErrandResponse(res.data.data.content, municipalityId),
        page: res.data.data.pageable.pageNumber,
        size: res.data.data.pageable.pageSize,
        totalPages: res.data.data.totalPages,
        totalElements: res.data.data.totalElements,
        labels: labels,
      } as ErrandsData;
      return response;
    })
    .catch((e) => {
      if (e.response.status) {
        return { ...emptyErrandList, error: e.response?.status.toString() ?? 'UNKNOWN ERROR' } as ErrandsData;
      } else {
        throw e;
      }
    });
};

export const useErrands = (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: { [key: string]: string | boolean | number },
  sort?: { [key: string]: 'asc' | 'desc' },
  extraParameters?: { [key: string]: string }
): ErrandsData => {
  const toastMessage = useSnackbar();
  const {
    setIsLoading,
    setErrands,
    setNewErrands,
    setOngoingErrands,
    setSuspendedErrands,
    setAssignedErrands,
    setClosedErrands,
    errands,
    newErrands,
    ongoingErrands,
    closedErrands,
    suspendedErrands,
  } = useAppContext();

  //Fix for slow loading of errands, can be removed when backend is fixed
  const currentRequestId = useRef<string | null>(null);

  const fetchErrands = useCallback(
    async (page: number = 0) => {
      const requestId = uuidv4();
      currentRequestId.current = requestId;
      setIsLoading(true);
      if (!filter) {
        return;
      }
      await getErrands(municipalityId, page, size, filter, sort, extraParameters)
        .then((res) => {
          if (currentRequestId.current === requestId) {
            setErrands({ ...res, isLoading: false });
            if (res.error && res.error !== '404') {
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Ärenden kunde inte hämtas',
                status: 'error',
              });
            }
          }
        })
        .catch(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Nya ärenden kunde inte hämtas',
            status: 'error',
          });
        });

      const fetchPromises = [
        getErrands(
          municipalityId,
          page,
          1,
          { ...filter, status: newStatuses.map(findStatusKeyForStatusLabel).join(',') },
          sort
        )
          .then((res) => {
            setNewErrands(res);
          })
          .catch((err) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Nya ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getErrands(
          municipalityId,
          page,
          1,
          {
            ...filter,
            status: ongoingStatuses.map(findStatusKeyForStatusLabel).join(','),
          },
          sort
        )
          .then((res) => {
            setOngoingErrands(res);
          })
          .catch((err) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Pågående ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getErrands(
          municipalityId,
          page,
          1,
          {
            ...filter,
            status: suspendedStatuses.map(findStatusKeyForStatusLabel).join(','),
          },
          sort
        )
          .then((res) => {
            setSuspendedErrands(res);
          })
          .catch((err) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Parkerade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getErrands(
          municipalityId,
          page,
          1,
          {
            ...filter,
            status: `Tilldelat`,
          },
          sort
        )
          .then((res) => {
            setAssignedErrands(res);
          })
          .catch((err) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Tilldelade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),

        getErrands(
          municipalityId,
          page,
          1,
          {
            ...filter,
            status: closedStatuses.map(findStatusKeyForStatusLabel).join(','),
          },
          sort
        )
          .then((res) => {
            setClosedErrands(res);
          })
          .catch((err) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Avslutade ärenden kunde inte hämtas',
              status: 'error',
            });
          }),
      ];
      if (currentRequestId.current == requestId) {
        return Promise.allSettled(fetchPromises);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      setErrands,
      setNewErrands,
      setOngoingErrands,
      setClosedErrands,
      errands,
      newErrands,
      ongoingErrands,
      closedErrands,
      suspendedErrands,
      size,
      filter,
      sort,
      toastMessage,
    ]
  );

  useEffect(() => {
    if (size && size > 0) {
      fetchErrands().then(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, size, sort]);

  useEffect(() => {
    if (page !== errands.page) fetchErrands(page).then(() => setIsLoading(false));
    //eslint-disable-next-line
  }, [page]);

  return errands;
};

export const blobToBase64: (blobl: Blob) => Promise<string> = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const createApiErrandData: (data: Partial<IErrand>) => Partial<RegisterErrandData> = (data) => {
  const stakeholders = makeStakeholdersList(data);
  const e: Partial<RegisterErrandData> = {
    ...(data.id && { id: data.id?.toString() }),
    ...(data.errandNumber && { errandNumber: data.errandNumber }),
    ...(data.priority && { priority: ApiPriority[data.priority] }),
    ...(data.caseType && { caseType: data.caseType }),
    ...(data.channel && { channel: ApiChannels[data.channel] }),
    ...(data.description && { description: data.description }),
    ...(data.caseType && { caseTitleAddition: CaseLabels.ALL[data.caseType] }),
    ...(data.status && { status: data.status }),
    ...(data.statuses && { statuses: data.statuses }),
    ...(data.phase && { phase: data.phase }),
    stakeholders: stakeholders,
  };
  return e;
};

interface SaveErrandResponse {
  errandId?: string;
  errand?: IErrand;
  errandSuccessful: boolean;
  attachmentsSuccessful: boolean;
  noteSuccessful: boolean;
}

export const saveErrand: (data: Partial<IErrand> & { municipalityId: string }) => Promise<SaveErrandResponse> = (
  data
) => {
  let result: SaveErrandResponse = {
    errandSuccessful: false,
    attachmentsSuccessful: false,
    noteSuccessful: false,
  };

  const errandData: Partial<RegisterErrandData> = createApiErrandData(data);
  return errandData.id
    ? apiService
        .patch<ApiResponse<ApiErrand>, Partial<RegisterErrandData>>(
          `casedata/${data.municipalityId}/errands/${errandData.id}`,
          errandData
        )
        .then(async (res) => {
          result.errandSuccessful = true;
          result.errandId = errandData.id;
          return result;
        })
        .catch((e) => {
          console.error('Something went wrong when patching errand');
          return Promise.reject(result);
        })
    : apiService
        .post<ApiResponse<ApiErrand>, Partial<RegisterErrandData>>(
          `casedata/${data.municipalityId}/errands`,
          errandData
        )
        .then(async (res) => {
          result.errandSuccessful = true;
          result.errand = mapErrandToIErrand(res.data.data, data.municipalityId);
          result.errandId = res.data.data.id.toString();
          return result;
        })
        .finally(() => {
          return result;
        })
        .catch((e) => {
          console.error('Something went wrong when creating errand');
          return Promise.reject(result);
        });
};

export const saveCroppedImage = async (
  municipalityId: string,
  errandId: number,
  attachment: Attachment,
  _blob: Blob
) => {
  if (!attachment?.id) {
    throw 'No attachment id found. Cannot save attachment without id.';
  }
  if (_blob.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
    throw new Error('MAX_SIZE');
  }
  const blob64 = await blobToBase64(_blob);
  const obj: Attachment = {
    category: attachment.category,
    name: attachment.name,
    note: '',
    extension: attachment.name.split('.').pop(),
    mimeType: attachment.mimeType,
    file: blob64.split(',')[1],
  };
  const buf = Buffer.from(obj.file, 'base64');
  const blob = new Blob([buf], { type: obj.mimeType });

  // Building form data
  const formData = new FormData();
  formData.append(`files`, blob, obj.name);
  formData.append(`category`, obj.category);
  formData.append(`name`, obj.name);
  formData.append(`note`, obj.note);
  formData.append(`extension`, obj.extension);
  formData.append(`mimeType`, obj.mimeType);
  const url = `casedata/${municipalityId}/errands/${errandId}/attachments/${attachment.id}`;
  return apiService
    .put<boolean, FormData>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when creating attachment ', obj.category);
      throw e;
    });
};

export const updateErrandStatus = async (municipalityId: string, id: string, status: ErrandStatus) => {
  const e: Partial<RegisterErrandData> = {
    id,
    status: { statusType: status },
  };
  return apiService
    .patch<boolean, Partial<RegisterErrandData>>(`casedata/${municipalityId}/errands/${id}`, e)
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when updating errand status', e);
      throw 'Något gick fel när ärendets status skulle uppdateras.';
    });
};

export const validateStatusForDecision: (e: IErrand) => { valid: boolean; reason: string } = (e) => {
  return { valid: true, reason: e.status?.statusType };
};

export const validateStakeholdersForDecision: (e: IErrand) => { valid: boolean; reason: string } = (e) => {
  if (isPT() && !e.stakeholders.some((s) => s.roles.includes(Role.APPLICANT))) {
    return { valid: false, reason: 'Ärendeägare saknas' };
  }
  return { valid: true, reason: '' };
};

export const validateErrandForDecision: (e: IErrand) => boolean = (e) => {
  return (
    validateStakeholdersForDecision(e).valid &&
    validateStatusForDecision(e).valid &&
    validateAttachmentsForDecision(e).valid
  );
};

export const phaseChangeInProgress = (errand: IErrand) => {
  if (!errand?.id) {
    return false;
  }
  if (errand.extraParameters.find((p) => p.key === 'process.phaseAction')?.values[0] === 'CANCEL') {
    return errand.extraParameters?.find((p) => p.key === 'process.phaseStatus')?.values[0] !== 'CANCELED';
  }

  if (errand.status?.statusType === ErrandStatus.ArendeAvslutat) {
    return false;
  }
  if (typeof errand.extraParameters?.find((p) => p.key === 'process.phaseStatus')?.values?.[0] === 'undefined') {
    return true;
  }
  if (
    errand.extraParameters?.find((p) => p.key === 'process.displayPhase')?.values[0] === UiPhase.registrerad &&
    !!errand.administrator
  ) {
    return true;
  }
  if (
    errand.phase === ErrandPhase.aktualisering ||
    errand.phase === ErrandPhase.utredning ||
    errand.phase === ErrandPhase.beslut ||
    errand.phase === ErrandPhase.verkstalla ||
    errand.phase === ErrandPhase.uppfoljning
  ) {
    return errand.extraParameters?.find((p) => p.key === 'process.phaseAction')?.values[0] === 'COMPLETE';
  } else {
    return errand.extraParameters?.find((p) => p.key === 'process.phaseStatus')?.values[0] !== 'WAITING';
  }
};

export const cancelErrandPhaseChange = async (municipalityId: string, errand: IErrand) => {
  if (!errand.id) {
    console.error('No id found. Cannot update errand wihout id. Returning.');
    return;
  }
  const newParameter: ExtraParameter = {
    key: 'process.phaseAction',
    values: ['CANCEL'],
  };
  const e: Partial<RegisterErrandData> = {
    id: errand.id.toString(),
    extraParameters: replaceExtraParameter(errand.extraParameters, newParameter),
  };
  return apiService
    .patch<boolean, Partial<RegisterErrandData>>(`casedata/${municipalityId}/errands/${errand.id}`, e)
    .catch((e) => {
      console.error('Something went wrong when cancelling errand phase change', e);
      throw e;
    });
};

export const triggerErrandPhaseChange = async (municipalityId: string, errand: IErrand) => {
  if (!errand?.id) {
    console.error('No id found. Cannot update errand wihout id. Returning.');
    return;
  }
  const newParameter: ExtraParameter = {
    key: 'process.phaseAction',
    values: ['COMPLETE'],
  };
  const e: Partial<RegisterErrandData> = {
    id: errand.id.toString(),
    extraParameters: replaceExtraParameter(errand.extraParameters, newParameter),
  };
  return apiService
    .patch<boolean, Partial<RegisterErrandData>>(`casedata/${municipalityId}/errands/${errand.id}`, e)
    .catch((e) => {
      console.error('Something went wrong when triggering errand phase change', e);
      throw e;
    });
};

export const getUiPhase: (errand: IErrand) => UiPhase = (errand) =>
  errand.extraParameters?.find((p) => p.key === 'process.displayPhase')?.values[0] as UiPhase;

export const validateAction: (errand: IErrand, user: User) => boolean = (errand, user) => {
  let allowed = false;
  if (errand?.extraParameters?.find((p) => p.key === 'process.displayPhase')?.values[0] === UiPhase.registrerad) {
    allowed = true;
  }
  if (user.username.toLocaleLowerCase() === errand?.administrator?.adAccount?.toLocaleLowerCase()) {
    allowed = true;
  }
  return allowed;
};

export const isErrandAdmin: (errand: IErrand, user: User) => boolean = (errand, user) => {
  return user.username.toLocaleLowerCase() === errand?.administrator?.adAccount?.toLocaleLowerCase();
};

export const isAdmin: (errand: IErrand, user: User) => boolean = (errand, user) => {
  return user.username.toLocaleLowerCase() === errand?.administrator?.adAccount?.toLocaleLowerCase();
};

export const setErrandStatus = async (
  errandId: number,
  municipalityId: string,
  status: ErrandStatus,
  date: string,
  comment: string
): Promise<Boolean> => {
  if (status === ErrandStatus.Parkerad && (date === '' || dayjs().isAfter(dayjs(date)))) {
    return Promise.reject('Invalid date');
  }

  const url = `casedata/${municipalityId}/errands/${errandId}`;
  const data: Partial<RegisterErrandData> = {
    id: errandId.toString(),
    status: { statusType: status },
    suspension: {
      suspendedFrom: status === ErrandStatus.Parkerad ? dayjs().toISOString() : undefined,
      suspendedTo: status === ErrandStatus.Parkerad ? dayjs(date).set('hour', 7).toISOString() : undefined,
    },
  };

  return apiService
    .patch<Boolean, Partial<RegisterErrandData>>(url, data)
    .then(async (res) => {
      if (status === ErrandStatus.Parkerad && comment) {
        const newNote: CreateErrandNoteDto = {
          title: '',
          text: comment,
          noteType: 'INTERNAL',
          extraParameters: {},
        };
        await saveErrandNote(municipalityId, errandId.toString(), newNote);
      }
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when suspending the errand', e);
      throw new Error('Något gick fel när ärendet skulle parkeras.');
    });
};

export const appealErrand: (data: Partial<IErrand> & { municipalityId: string }) => Promise<SaveErrandResponse> = (
  data
) => {
  let result: SaveErrandResponse = {
    errandSuccessful: false,
    attachmentsSuccessful: false,
    noteSuccessful: false,
  };

  const relatedErrand: Partial<RelatedErrand> = {
    errandId: data.id,
    errandNumber: data.errandNumber,
    relationReason: 'APPEAL',
  };

  const errandData: Partial<RegisterErrandData> = {
    ...(data.priority && { priority: ApiPriority[data.priority] }),
    ...(data.channel && { channel: ApiChannels['WEB_UI'] }),
    caseTitleAddition: CaseLabels.PT.APPEAL,
    caseType: 'APPEAL',
    relatesTo: [relatedErrand],
    applicationReceived: dayjs().toISOString(),
    stakeholders: makeStakeholdersList(data),
  };

  return apiService
    .post<ApiResponse<ApiErrand>, Partial<RegisterErrandData>>(`casedata/${data.municipalityId}/errands`, errandData)
    .then(async (res) => {
      result.errandSuccessful = true;
      result.errandId = res.data.data.id.toString();
      return result;
    })
    .finally(() => {
      return result;
    })
    .catch((e) => {
      console.error('Something went wrong when appealing errand');
      return result;
    });
};
