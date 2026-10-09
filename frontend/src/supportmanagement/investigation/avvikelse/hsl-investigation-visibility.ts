import type { InvestigationErrandContext, InvestigationViewer } from '../investigation-variant';
import { hasErrandLabel, HIGH_HSL_RISK_LABEL_PATH } from './assignment/avvikelse-access-labels';
import {
  HEAD_OF_OPERATIONS_ROLE_KEY,
  MAS_MAR_ROLE_KEY,
  UNIT_MANAGER_ROLE_KEY,
} from './assignment/avvikelse-handler-roles';
import { HSL_INVESTIGATION_SCHEMA_NAME } from './avvikelse-schema-names';
import { findInvestigationDocumentBySchemaName } from './saved-investigation-document';

const MANAGER_ROLE_KEYS: readonly string[] = [UNIT_MANAGER_ROLE_KEY, HEAD_OF_OPERATIONS_ROLE_KEY];

/**
 * Whether the HSL investigation is kept out of the viewer's sight: a unit manager or head of operations does not
 * see it until the errand carries a high HSL risk. MAS/MAR, an administrator and every other role see it as their
 * access says.
 */
export const concealsHslInvestigation = (
  { roleKeys = [], superadmin }: InvestigationViewer,
  carriesHighHslRisk: boolean
): boolean =>
  !carriesHighHslRisk &&
  !superadmin &&
  !roleKeys.includes(MAS_MAR_ROLE_KEY) &&
  roleKeys.some((roleKey) => MANAGER_ROLE_KEYS.includes(roleKey));

/** The documents avvikelse keeps out of the viewer's sight on the errand: the HSL investigation, while concealed. */
export const concealedAvvikelseDocumentKeys = ({
  errand,
  profile,
  labelStructure,
  viewer,
}: InvestigationErrandContext): readonly string[] => {
  const hslInvestigationKey = findInvestigationDocumentBySchemaName(profile, HSL_INVESTIGATION_SCHEMA_NAME)?.key;
  if (!hslInvestigationKey) return [];
  const carriesHighHslRisk = hasErrandLabel(errand?.labels, labelStructure, HIGH_HSL_RISK_LABEL_PATH);
  return concealsHslInvestigation(viewer, carriesHighHslRisk) ? [hslInvestigationKey] : [];
};
