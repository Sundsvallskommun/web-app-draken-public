import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';

import type { InvestigationProfile } from '../../investigation-profile';
import type { InvestigationFormData } from '../investigation-document';
import { findInvestigationDocumentBySchemaName, readSavedInvestigationDocument } from '../saved-investigation-document';
import { ACCESS_LEX_LABEL_PATH, hasErrandLabel } from './avvikelse-access-labels';

interface LexAssignmentInput {
  readonly formData: InvestigationFormData;
  readonly labels: Label[] | undefined;
  readonly labelStructure: Label[] | undefined;
}

/** The document whose assessment of suspected misconduct decides the handover to LEX. */
const UNIT_MANAGER_INVESTIGATION_SCHEMA_NAME = 'utredning-enhetschef';

/** Whether a unit manager investigation assesses the deviation as a suspected misconduct. */
export const assessesSuspectedMisconduct = (formData: InvestigationFormData | undefined): boolean =>
  formData?.suspectedMisconduct === 'yes';

/**
 * Whether a saved unit manager investigation has to be handed to a LEX manager.
 *
 * The rule reads the saved form together with the errand's own labels, because the label is the
 * record of a handover that already happened: answering "yes" to suspected misconduct a second time
 * must not ask for a new LEX manager.
 *
 * The HSL risk value deliberately triggers nothing here. It is shown as a warning to the unit
 * manager, but there is no access label for MAS/MAR to write.
 */
export const shouldPromptLexAssignment = ({ formData, labels, labelStructure }: LexAssignmentInput): boolean =>
  assessesSuspectedMisconduct(formData) && !hasErrandLabel(labels, labelStructure, ACCESS_LEX_LABEL_PATH);

interface LexAssignmentRequirementInput {
  readonly errand: SupportErrand | undefined;
  readonly profile: InvestigationProfile | null | undefined;
  readonly labelStructure: Label[] | undefined;
}

/**
 * Whether the errand still has to be handed to a LEX manager before it may be decided: the unit
 * manager investigation saved on it assesses a suspected misconduct, and no handover has happened.
 *
 * The dialog that asks for the handover after saving can be put off; this is what makes it unavoidable
 * before the decision. Only the saved document counts - an unsaved answer is not yet an assessment.
 */
export const requiresLexAssignment = ({ errand, profile, labelStructure }: LexAssignmentRequirementInput): boolean => {
  const key = findInvestigationDocumentBySchemaName(profile, UNIT_MANAGER_INVESTIGATION_SCHEMA_NAME)?.key;
  const saved = readSavedInvestigationDocument(errand, key);
  if (!saved) return false;
  return shouldPromptLexAssignment({ formData: saved, labels: errand?.labels, labelStructure });
};

/**
 * Whether the errand is with the LEX roles, and can therefore be handed back to its unit manager.
 * The label is the state: it is what took the errand away from the manager in the first place.
 */
export const isWithLexInvestigation = (labels: Label[] | undefined, labelStructure: Label[] | undefined): boolean =>
  hasErrandLabel(labels, labelStructure, ACCESS_LEX_LABEL_PATH);
