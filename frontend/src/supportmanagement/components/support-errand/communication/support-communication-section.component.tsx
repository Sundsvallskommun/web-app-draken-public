'use client';

import { supportInvestigationTextKeys } from '@supportmanagement/services/support-investigation-sections';
import { FC } from 'react';

import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

export const SupportCommunicationSection: FC<InvestigationSectionProps> = (props) => (
  <div className="flex flex-col gap-24" data-cy="communication-section">
    <InvestigationSectionText {...props} name="communication" {...supportInvestigationTextKeys('communication')} />
  </div>
);
