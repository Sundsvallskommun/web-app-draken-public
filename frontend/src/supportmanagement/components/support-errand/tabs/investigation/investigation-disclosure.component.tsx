import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { Disclosure } from '@sk-web-gui/react';
import {
  sectionKeyOf,
  type Sections,
  supportInvestigationSectionSpec,
  supportInvestigationTextKeys,
} from '@supportmanagement/services/support-investigation-sections';
import { JSX, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportCommunicationSection } from '../../communication/support-communication-section.component';
import { SupportFinancialSuitabilitySection } from '../../financial-suitability/support-financial-suitability-section.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../../investigation-section-text.component';
import { SupportPbiExaminationSection } from '../../pbi-examination/support-pbi-examination-section.component';
import { SupportPremisesSection } from '../../premises/support-premises-section.component';
import { SupportStatementsSection } from '../../statements/support-statements-section.component';

const writtenSection = (sectionKey: Sections, props: InvestigationSectionProps): JSX.Element => (
  <InvestigationSectionText {...props} name={sectionKey} {...supportInvestigationTextKeys(sectionKey)} />
);

export const SectionDisclosure: React.FC<{
  section: InvestigationSection;
  investigationId: string | undefined;
  writable: boolean;
  onEdited: (sectionKey: string, edited: boolean) => void;
  onSaved: (investigation: Investigation) => void;
  saveRef: React.MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({ section, investigationId, writable, onEdited, onSaved, saveRef }) => {
  const { t } = useTranslation();

  const sectionKey = sectionKeyOf(section);
  const noteEdited = useCallback((edited: boolean) => onEdited(sectionKey, edited), [onEdited, sectionKey]);
  const props: InvestigationSectionProps = {
    section,
    investigationId,
    writable,
    onEdited: noteEdited,
    onSaved,
    saveRef,
  };

  const sectionContent: Partial<Record<Sections, JSX.Element>> = {
    statements: <SupportStatementsSection writable={writable} onEdited={noteEdited} saveRef={saveRef} />,
    persons_of_influence: <SupportPbiExaminationSection {...props} />,
    financial_suitability: <SupportFinancialSuitabilitySection {...props} />,
    premises: <SupportPremisesSection {...props} />,
    lease: writtenSection('lease', props),
    fire_safety: writtenSection('fire_safety', props),
    food_and_beverages: writtenSection('food_and_beverages', props),
    staffing: writtenSection('staffing', props),
    communication: <SupportCommunicationSection {...props} />,
    child_perspective: writtenSection('child_perspective', props),
  };

  const spec = supportInvestigationSectionSpec(section);
  const heading = spec ? t(spec.headingKey) : section.heading;
  const content = spec ? sectionContent[spec.sectionKey] : undefined;

  return (
    section.sectionKey && (
      <Disclosure variant="alt" className="w-full" data-cy={`section-${section.sectionKey}`}>
        <Disclosure.Header>
          <Disclosure.Title>{heading}</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          {content ?? <p className="text-dark-secondary m-0">{t('common:investigation.section_not_built')}</p>}
        </Disclosure.Content>
      </Disclosure>
    )
  );
};
