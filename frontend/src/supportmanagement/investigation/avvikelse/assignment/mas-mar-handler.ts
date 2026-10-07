import type { SupportErrand } from '@supportmanagement/services/support-errand-service';

import type { InvestigationViewer } from '../../investigation-variant';
import { MAS_MAR_ROLE_KEY } from './avvikelse-handler-roles';

/** The errand parameter the MAS/MAR handler is recorded in - beside the assignee, never in its place. */
export const MAS_MAR_HANDLER_PARAMETER = 'masMarHandler';

/**
 * Whether the viewer chooses the errand's MAS/MAR handler: MAS/MAR themselves, on every errand they reach. An
 * administrator is held back by no role; everybody else sees no MAS/MAR select at all.
 */
export const choosesMasMarHandler = ({ roleKeys = [], superadmin }: InvestigationViewer): boolean =>
  Boolean(superadmin) || roleKeys.includes(MAS_MAR_ROLE_KEY);

/** The MAS/MAR handler recorded on the errand, by AD account. */
export const readMasMarHandler = (errand: SupportErrand | undefined): string | undefined =>
  errand?.parameters?.find((parameter) => parameter.key === MAS_MAR_HANDLER_PARAMETER)?.values?.[0] || undefined;
