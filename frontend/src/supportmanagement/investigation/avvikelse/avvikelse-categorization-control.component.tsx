'use client';

import { useMetadataStore } from '@stores/index';
import { IafLabelCategorization } from '@supportmanagement/components/support-errand-basics-form/iaf-label-categorization.component';
import type { FC } from 'react';

import { IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY } from '../iaf-vof-investigation-classification-policy';
import type { InvestigationCategorizationControlProps } from '../investigation-variant';

/**
 * Adapts the avvikelse categorization control to the variant contract: Grundinformation passes only
 * whether the control is disabled, and everything else - the label tree vocabulary and the metadata
 * it is read from - is this variant's own business.
 */
export const AvvikelseCategorizationControl: FC<InvestigationCategorizationControlProps> = ({ disabled }) => {
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);

  return (
    <IafLabelCategorization
      supportMetadata={supportMetadata}
      labelTree={IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree}
      disabled={disabled}
    />
  );
};
