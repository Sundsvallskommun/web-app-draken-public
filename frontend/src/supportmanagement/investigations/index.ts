import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { Sections } from '@supportmanagement/services/support-investigation-sections';

import { INSPECTION_INVESTIGATION } from './inspection';
import { SERVING_PERMIT_INVESTIGATION } from './serving-permit';
import { TOBACCO_SALES_INVESTIGATION } from './tobacco-sales';
import type { InvestigationVariant } from './types';

export type { ExaminedInvestigation, InvestigationVariant } from './types';

export const INVESTIGATION_VARIANTS: InvestigationVariant[] = [
  SERVING_PERMIT_INVESTIGATION,
  TOBACCO_SALES_INVESTIGATION,
  INSPECTION_INVESTIGATION,
];

const CLASSIFICATIONS_FROM_THE_MOST_SPECIFIC = ['SUBTYPE', 'TYPE', 'CATEGORY'] as const;

type ClassifiedErrand = Pick<SupportErrand, 'labels'>;

const resourceNamesOf = (errand: ClassifiedErrand | undefined): string[] =>
  CLASSIFICATIONS_FROM_THE_MOST_SPECIFIC.map(
    (classification) => (errand?.labels ?? []).find((label) => label.classification === classification)?.resourceName
  ).filter((resourceName): resourceName is string => !!resourceName);

const variantNamed = (resourceName: string): InvestigationVariant | undefined =>
  INVESTIGATION_VARIANTS.find((variant) => variant.resourceNames.includes(resourceName));

/** The most specific level that names a variant wins; a type inherits its category until it names one. */
export const investigationVariantFor = (errand: ClassifiedErrand | undefined): InvestigationVariant =>
  resourceNamesOf(errand).map(variantNamed).find(Boolean) ?? SERVING_PERMIT_INVESTIGATION;

/** The examinations the errand type has, which an errand examined by protocol has none of. */
export const examinedSections = (variant: InvestigationVariant): readonly Sections[] =>
  variant.body === 'sections' ? variant.sections : [];
