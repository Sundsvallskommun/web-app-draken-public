'use client';

import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { FC, MutableRefObject } from 'react';

import { InvestigationTextEditor } from './investigation-text-editor.component';
import { useInvestigationSectionSave } from './use-investigation-section-save';

/** What the investigation tab hands every section so the section can save itself when the tab saves. */
export interface InvestigationSectionProps {
  section: InvestigationSection;
  investigationId: string | undefined;
  writable: boolean;
  onEdited: (edited: boolean) => void;
  onSaved: (investigation: Investigation) => void;
  saveRef: MutableRefObject<(() => Promise<boolean>) | undefined>;
}

interface WrittenPart {
  name: string;
  labelKey: string;
  placeholderKey: string;
  saveFailedKey: string;
}

export const InvestigationSectionText: FC<InvestigationSectionProps & WrittenPart> = ({
  name,
  labelKey,
  placeholderKey,
  saveFailedKey,
  ...props
}) => {
  const { values, set, readOnly } = useInvestigationSectionSave(props, saveFailedKey);

  return (
    <InvestigationTextEditor
      name={name}
      labelKey={labelKey}
      placeholderKey={placeholderKey}
      value={values.text}
      readOnly={readOnly}
      onChange={(markup) => set('text', markup)}
    />
  );
};
