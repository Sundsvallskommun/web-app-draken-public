import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { saveChangedErrandParameters } from '@supportmanagement/services/support-parameter-service';

import type { InvestigationTakeErrand, InvestigationViewer } from '../../investigation-variant';
import { MAS_MAR_ROLE_KEY } from './avvikelse-handler-roles';
import { MAS_MAR_HANDLER_PARAMETER, readMasMarHandler } from './mas-mar-handler';

/** Records the errand's MAS/MAR handler, on the parameter's own version. The handler already recorded writes nothing. */
export const saveMasMarHandler = async (municipalityId: string, errand: SupportErrand, account: string) => {
  if (!errand.id) throw new Error('The errand has no id to record its MAS/MAR handler on');
  await saveChangedErrandParameters(municipalityId, errand.id, errand.parameters, [
    { key: MAS_MAR_HANDLER_PARAMETER, displayName: 'MAS/MAR', values: [account] },
  ]);
};

const takeErrandAsMasMarHandler: InvestigationTakeErrand = Object.freeze({
  isTakenBy: (errand: SupportErrand, account: string) => readMasMarHandler(errand) === account,
  take: saveMasMarHandler,
  successMessage: 'Du är nu MAS/MAR på ärendet',
  failureMessage: 'Något gick fel när MAS/MAR sparades',
});

/**
 * MAS/MAR take an errand as its MAS/MAR handler, and it stays with its assignee. Everybody else, an administrator
 * too, is assigned it as before.
 */
export const masMarTakeErrand = ({ roleKeys = [] }: InvestigationViewer): InvestigationTakeErrand | undefined =>
  roleKeys.includes(MAS_MAR_ROLE_KEY) ? takeErrandAsMasMarHandler : undefined;
