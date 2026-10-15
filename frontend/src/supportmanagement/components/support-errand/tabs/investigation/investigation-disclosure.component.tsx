import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { Disclosure } from '@sk-web-gui/react';
import type { Sections } from '@supportmanagement/services/support-investigation-service';
import { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportFinancialSuitabilitySection } from '../../financial-suitability/support-financial-suitability-section.component';
import { SupportPbiExaminationSection } from '../../pbi-examination/support-pbi-examination-section.component';
import { SupportPremisesSection } from '../../premises/support-premises-section.component';
import { SupportStatementsSection } from '../../statements/support-statements-section.component';

export const SectionDisclosure: React.FC<{
  section: InvestigationSection;
  investigationId: string | undefined;
  writable: boolean;
  onStatementsEdited: (edited: boolean) => void;
  saveStatements: React.MutableRefObject<(() => Promise<boolean>) | undefined>;
  onFinancialEdited: (edited: boolean) => void;
  onFinancialSaved: (investigation: Investigation) => void;
  saveFinancial: React.MutableRefObject<(() => Promise<boolean>) | undefined>;
  onPremisesEdited: (edited: boolean) => void;
  onPremisesSaved: (investigation: Investigation) => void;
  savePremises: React.MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({
  section,
  investigationId,
  writable,
  onStatementsEdited,
  saveStatements,
  onFinancialEdited,
  onFinancialSaved,
  saveFinancial,
  onPremisesEdited,
  onPremisesSaved,
  savePremises,
}) => {
  const { t } = useTranslation();

  const sectionContent: Partial<Record<Sections, JSX.Element>> = {
    statements: <SupportStatementsSection writable={writable} onEdited={onStatementsEdited} saveRef={saveStatements} />,
    personal_suitability: <SupportPbiExaminationSection writable={writable} />,
    financial_suitability: (
      <SupportFinancialSuitabilitySection
        section={section}
        investigationId={investigationId}
        writable={writable}
        onEdited={onFinancialEdited}
        onSaved={onFinancialSaved}
        saveRef={saveFinancial}
      />
    ),
    premises: (
      <SupportPremisesSection
        section={section}
        investigationId={investigationId}
        writable={writable}
        onEdited={onPremisesEdited}
        onSaved={onPremisesSaved}
        saveRef={savePremises}
      />
    ),
  };

  return (
    section.sectionKey && (
      <Disclosure variant="alt" className="w-full" data-cy={`section-${section.sectionKey}`}>
        <Disclosure.Header>
          <Disclosure.Title>{section.heading}</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          {sectionContent[section.sectionKey] ?? (
            <p className="text-dark-secondary m-0">{t('common:investigation.section_not_built')}</p>
          )}
        </Disclosure.Content>
      </Disclosure>
    )
  );
};
