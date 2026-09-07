import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import type { JsonObject } from '@/services/schema-bound-json.service';

export interface SupportInvestigationClassificationLabelTree {
  readonly root: Readonly<{ resource: string; classification: string }>;
  readonly ownerClassification: string;
  readonly categoryClassification: string;
  readonly typeClassification: string;
}

export interface SupportInvestigationClassificationPolicy {
  readonly labelTree: SupportInvestigationClassificationLabelTree;
  preservesOwnerParameters(current: Errand['parameters'], requested: Errand['parameters']): boolean;
  assertClassificationContext(
    errand: Pick<Errand, 'parameters' | 'labels'>,
    documentKey: string,
    documentValue: JsonObject,
    classification: Readonly<{ category: string; type: string }>,
  ): void;
}
