import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';

export const PROCESS_PARAMETER_KEYS = ['process.displayPhase', 'process.phaseAction', 'process.phaseStatus'];

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

export const getUiPhase: (errand: IErrand) => UiPhase = (errand) =>
  errand.extraParameters?.find((p) => p.key === 'process.displayPhase')?.values[0] as UiPhase;

export const cancelErrandPhaseChange = async (municipalityId: string, errand: IErrand) =>
  savePhaseAction(municipalityId, 'CANCEL', errand);

export const triggerErrandPhaseChange = async (municipalityId: string, errand: IErrand) =>
  savePhaseAction(municipalityId, 'COMPLETE', errand);

const savePhaseAction = (municipalityId: string, phaseAction: 'CANCEL' | 'COMPLETE', errand: IErrand) => {
  if (!errand?.id) {
    return Promise.reject('No errand id');
  }
  return apiService.patch<any, ExtraParameter[]>(
    `casedata/${municipalityId}/errands/${errand.id}/extraparameters/process`,
    [
      {
        key: 'process.phaseAction',
        values: [phaseAction],
      },
    ]
  );
};
