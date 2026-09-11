import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';

import type { InvestigationFormData } from '../investigation-document';
import { ACCESS_LEX_LABEL_PATH, hasErrandLabel } from './avvikelse-access-labels';

interface LexAssignmentInput {
  readonly formData: InvestigationFormData;
  readonly labels: Label[] | undefined;
  readonly labelStructure: Label[] | undefined;
}

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
  formData.suspectedMisconduct === 'yes' && !hasErrandLabel(labels, labelStructure, ACCESS_LEX_LABEL_PATH);

/**
 * Whether the errand is with the LEX roles, and can therefore be handed back to its unit manager.
 * The label is the state: it is what took the errand away from the manager in the first place.
 */
export const isWithLexInvestigation = (labels: Label[] | undefined, labelStructure: Label[] | undefined): boolean =>
  hasErrandLabel(labels, labelStructure, ACCESS_LEX_LABEL_PATH);
