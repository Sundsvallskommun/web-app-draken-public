'use client';

import { useMetadataStore } from '@stores/index';
import { AvvikelseLabelCategorization } from '@supportmanagement/investigation/avvikelse/avvikelse-label-categorization.component';
import type { FC } from 'react';

import type { InvestigationCategorizationControlProps } from '../investigation-variant';
import { AVVIKELSE_CLASSIFICATION_POLICY } from './avvikelse-classification-policy';

/**
 * Adapts the avvikelse categorization control to the variant contract: Grundinformation passes only
 * whether the control is disabled, and everything else - the label tree vocabulary and the metadata
 * it is read from - is this variant's own business.
 */
export const AvvikelseCategorizationControl: FC<InvestigationCategorizationControlProps> = ({ disabled }) => {
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);

  return (
    <AvvikelseLabelCategorization
      supportMetadata={supportMetadata}
      labelTree={AVVIKELSE_CLASSIFICATION_POLICY.labelTree}
      disabled={disabled}
    />
  );
};
