import { Disclosure } from '@sk-web-gui/react';
import { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { InvestigationSection } from '../../../../../common/data-contracts/supportmanagement/data-contracts';
import type { Sections } from '../../../../../supportmanagement/services/support-investigation-service';
import { SupportPersonalSuitabilitySection } from '../../personal-suitability/support-personal-suitability-section.component';
import { SupportStatementsSection } from '../../statements/support-statements-section.component';

export const SectionDisclosure: React.FC<{
  section: InvestigationSection;
  writable: boolean;
  onStatementsEdited: (edited: boolean) => void;
  saveStatements: React.MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({ section, writable, onStatementsEdited, saveStatements }) => {
  const { t } = useTranslation();

  const sectionContent: Partial<Record<Sections, JSX.Element>> = {
    statements: <SupportStatementsSection writable={writable} onEdited={onStatementsEdited} saveRef={saveStatements} />,
    personal_suitability: <SupportPersonalSuitabilitySection />,
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
