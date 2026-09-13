import type { Errand, Label } from '@/data-contracts/supportmanagement/data-contracts';
import type { JsonObject } from '@/services/schema-bound-json.service';

/**
 * Structural shapes of the classification payload. The controller's class-validator DTOs satisfy
 * these, which keeps the validation classes in the controller without the service importing them.
 */
export interface ClassificationSpec {
  category: string;
  type: string;
}

export interface LabelIdReference {
  id: string;
}

export interface SupportErrandClassificationSelection {
  classification: ClassificationSpec;
  categoryLabels: LabelIdReference[];
}

export interface ResolvedSupportErrandClassification {
  classification: ClassificationSpec;
  categoryLabels: LabelIdReference[];
  managedCategoryLabelIds: string[];
  managedRootResource: string;
}

export interface SupportInvestigationClassificationPolicy {
  resolveClassification(
    data: SupportErrandClassificationSelection,
    labelStructure: readonly Label[] | undefined,
  ): ResolvedSupportErrandClassification;
  preservesOwnerParameters(current: Errand['parameters'], requested: Errand['parameters']): boolean;
  assertClassificationContext(
    errand: Pick<Errand, 'parameters' | 'labels'>,
    documentKey: string,
    documentValue: JsonObject,
    classification: Readonly<{ category: string; type: string }>,
  ): void;
}
