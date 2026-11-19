import { certificateTemplate } from '@supportmanagement/services/support-decision-parameters-service';
import { supportDecisionPermitType } from '@supportmanagement/services/support-decision-service';
import { getMostSpecificLabelType, type SupportErrand } from '@supportmanagement/services/support-errand-service';

export interface DecisionPermit {
  /** The decision's type, which the process and the templates go by. */
  type: string;
  /** The template that prints the permit, or undefined for a decision that issues none. */
  certificate: string | undefined;
  /** A serving permit asks for things no other permit does. */
  serving: boolean;
  /** The most specific type label of the errand, e.g. TASTING. */
  errandType: string | undefined;
}

const SERVING = 'SERVERINGSTILLSTAND';

/** What kind of permit the errand decides on, read off its labels and the process it runs. */
export const decisionPermit = (errand: SupportErrand | undefined): DecisionPermit => {
  const typeLabel = errand ? getMostSpecificLabelType(errand) : undefined;
  const type = supportDecisionPermitType(typeLabel, errand?.process?.processKey);

  return {
    type,
    certificate: certificateTemplate(type),
    serving: type === SERVING,
    errandType: typeLabel?.resourceName,
  };
};
