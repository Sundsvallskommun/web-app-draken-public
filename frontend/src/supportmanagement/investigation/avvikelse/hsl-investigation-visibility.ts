import type { InvestigationErrandContext, InvestigationViewer } from '../investigation-variant';
import { hasErrandLabel, HIGH_HSL_RISK_LABEL_PATH } from './assignment/avvikelse-access-labels';
import {
  HEAD_OF_OPERATIONS_ROLE_KEY,
  MAS_MAR_ROLE_KEY,
  UNIT_MANAGER_ROLE_KEY,
} from './assignment/avvikelse-handler-roles';
import { HSL_COMMISSIONER_COMMENT_SCHEMA_NAME, HSL_INVESTIGATION_SCHEMA_NAME } from './avvikelse-schema-names';
import { findInvestigationDocumentBySchemaName } from './saved-investigation-document';

const MANAGER_ROLE_KEYS: readonly string[] = [UNIT_MANAGER_ROLE_KEY, HEAD_OF_OPERATIONS_ROLE_KEY];

/**
 * The documents of the HSL investigation: MAS/MAR's event analysis, and the comment on it by the one who
 * commissioned it. The comment has nothing to comment on where the analysis is not shown, so the two are kept out of
 * sight together.
 */
const HSL_INVESTIGATION_SCHEMA_NAMES: readonly string[] = [
  HSL_INVESTIGATION_SCHEMA_NAME,
  HSL_COMMISSIONER_COMMENT_SCHEMA_NAME,
];

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

/**
 * The documents avvikelse keeps out of the viewer's sight on the errand: the HSL investigation and the comment on
 * it, while concealed.
 */
export const concealedAvvikelseDocumentKeys = ({
  errand,
  profile,
  labelStructure,
  viewer,
}: InvestigationErrandContext): readonly string[] => {
  const hslInvestigationKeys = HSL_INVESTIGATION_SCHEMA_NAMES.map(
    (schemaName) => findInvestigationDocumentBySchemaName(profile, schemaName)?.key
  ).filter((key): key is string => typeof key === 'string');
  if (hslInvestigationKeys.length === 0) return [];
  const carriesHighHslRisk = hasErrandLabel(errand?.labels, labelStructure, HIGH_HSL_RISK_LABEL_PATH);
  return concealsHslInvestigation(viewer, carriesHighHslRisk) ? hslInvestigationKeys : [];
};
