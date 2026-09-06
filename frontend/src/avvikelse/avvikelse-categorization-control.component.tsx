'use client';

import { AvvikelseLabelCategorization } from '@avvikelse/avvikelse-label-categorization.component';
import { useMetadataStore } from '@stores/index';
import type { FC } from 'react';

import type { InvestigationCategorizationControlProps } from '../supportmanagement/investigation/investigation-variant';
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
