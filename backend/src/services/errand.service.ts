import { CASEDATA_NAMESPACE } from '@/config';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { UiPhase } from '@/interfaces/errand-phase.interface';
import { CPatchErrandDto, CreateErrandDto } from '@interfaces/errand.interface';
import { User } from '@interfaces/users.interface';
import { apiURL } from '@utils/util';
import ApiService from './api.service';
import { getLastUpdatedAdministrator } from './stakeholder.service';
import { apiServiceName } from '@/config/api-config';

const SERVICE = apiServiceName('case-data');

export const validateErrandPhaseChange: (errand: CreateErrandDto, user: User) => Promise<boolean> = async (errand, user) => {
  const apiService = new ApiService();
  const url = `errands/${errand.id}`;
  const baseURL = apiURL(SERVICE);
  const existingErrand = await apiService.get<ErrandDTO>({ url, baseURL }, user);
  const oldPhase = existingErrand.data.phase;
  const newPhase = errand.phase;
  if ((newPhase === 'Aktualisering' && oldPhase === 'Utredning') || (newPhase === 'Utredning' && oldPhase === 'Beslut')) {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
};

export const makeErrandApiData: (errandData: CreateErrandDto | CPatchErrandDto, errandId: string) => CreateErrandDto = (errandData, errandId) => {
  const newErrand: CreateErrandDto = {
    ...(errandId && { id: parseInt(errandId, 10) }),
    ...(errandData.caseType && { caseType: errandData.caseType }),
    ...(errandData.priority && { priority: errandData.priority as any }),
    ...(errandData.description && { description: errandData.description }),
    ...(errandData.caseTitleAddition && { caseTitleAddition: errandData.caseTitleAddition }),
    ...(errandData.startDate && { startDate: errandData.startDate }),
    ...(errandData.endDate && { endDate: errandData.endDate }),
    ...(errandData.diaryNumber && { diaryNumber: errandData.diaryNumber }),
    ...(errandData.phase && { phase: errandData.phase }),
    ...(errandData.suspension && errandData.suspension.suspendedFrom && errandData.suspension.suspendedTo
      ? {
          suspension: {
            suspendedFrom: errandData.suspension.suspendedFrom,
            suspendedTo: errandData.suspension.suspendedTo,
          },
        }
      : {}),
    ...(errandData.status && { status: errandData.status }),
    ...(errandData.statuses && { stauses: errandData.statuses }),
    ...(errandData.stakeholders && { stakeholders: errandData.stakeholders }),
    ...(errandData.extraParameters && { extraParameters: errandData.extraParameters }),
    ...(errandData.relatesTo && { relatesTo: errandData.relatesTo }),
    ...(errandData.applicationReceived && { applicationReceived: errandData.applicationReceived }),
  };
  return newErrand;
};

export const validateAction: (municipalityId: string, errandId: string, user: User) => Promise<boolean> = async (municipalityId, errandId, user) => {
  let allowed = false;
  const apiService = new ApiService();
  const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}`;
  const baseURL = apiURL(SERVICE);
  const existingErrand = await apiService.get<ErrandDTO>({ url, baseURL }, user);
  if (existingErrand.data.extraParameters.find(p => p.key === 'process.displayPhase')?.values[0] === UiPhase.registrerad) {
    allowed = true;
  }
  if (user.username.toLocaleLowerCase() === getLastUpdatedAdministrator(existingErrand.data.stakeholders)?.adAccount.toLocaleLowerCase()) {
    allowed = true;
  }
  return Promise.resolve(allowed);
};
