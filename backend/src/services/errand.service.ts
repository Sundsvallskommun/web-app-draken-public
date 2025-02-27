import { CPatchErrandDto, CreateErrandDto } from '@interfaces/errand.interface';
import { Role } from '@interfaces/role';
import { User } from '@interfaces/users.interface';
import { logger } from '@/utils/logger';
import { apiURL, latestBy } from '@utils/util';
import ApiService from './api.service';
import { UiPhase } from '@/interfaces/errand-phase.interface';
import { getLastUpdatedAdministrator } from './stakeholder.service';
import { Errand as ErrandDTO, PatchErrandCaseTypeEnum } from '@/data-contracts/case-data/data-contracts';
import { CASEDATA_NAMESPACE } from '@/config';

const SERVICE = `case-data/11.0`;

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
    ...(errandData.caseType && { caseType: errandData.caseType as unknown as PatchErrandCaseTypeEnum }),
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

export const withAdministratorIfChanged: (errandData: CreateErrandDto, errandId: string, user: User) => Promise<ErrandDTO> = async (
  errandData,
  errandId,
  user,
) => {
  const apiService = new ApiService();
  const url = `${errandData.municipalityId}/errands/${errandId}`;
  const baseURL = apiURL(SERVICE);
  const existingErrand = await apiService.get<ErrandDTO>({ url, baseURL }, user);
  const existingAdministrator = latestBy(
    existingErrand.data.stakeholders.filter(s => s.roles.includes(Role.ADMINISTRATOR)),
    'updated',
  );
  const newAdministrator = errandData.stakeholders?.reverse().find(s => s.roles.includes(Role.ADMINISTRATOR));
  const result = errandData;
  if (newAdministrator && existingAdministrator?.adAccount === newAdministrator?.adAccount) {
    logger.info('Inbound administrator stakeholder matches existing one, so is removed from request.');
    result.stakeholders = errandData.stakeholders?.filter(s => !s.roles.includes(Role.ADMINISTRATOR)) || [];
  }
  return result;
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
