'use client';

import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { pbiOf, stakeholderName, withEngagements } from '@supportmanagement/services/support-pbi-service';
import { Building2 } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { CompanyEngagementChoice } from '../company-engagements/company-engagement-choice.component';
import { BlockIntro } from './support-pbi-examination-block.component';

interface EngagementsBlockProps {
  person: SupportStakeholderFormModel;
  writable: boolean;
  onChange: (person: SupportStakeholderFormModel) => void;
}

export const EngagementsBlock: FC<EngagementsBlockProps> = ({ person, writable, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8">
      <BlockIntro
        label={t('common:pbi_engagements.label')}
        description={t('common:pbi_engagements.description')}
        icon={<Building2 />}
      />

      <CompanyEngagementChoice
        partyId={person.externalId}
        personalNumber={person.personNumber}
        personName={stakeholderName(person)}
        chosen={pbiOf(person).engagements}
        writable={writable}
        onChange={(companies) =>
          onChange(
            withEngagements(
              person,
              companies.map((company) => company.organizationNumber)
            )
          )
        }
        textKey="common:pbi_engagements"
        dataCy={`pbi-engagements-${person.internalId}`}
      />
    </div>
  );
};
