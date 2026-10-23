'use client';

import { formatOrgNr, OrgNumberFormat } from '@common/services/helper-service';
import {
  getLegalEntityPersonEngagements,
  type LegalEntityPersonEngagement,
  personEngagementRoles,
} from '@common/services/legal-entity-service';
import { Chip, Combobox, FormControl, FormLabel, Spinner } from '@sk-web-gui/react';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import {
  pbiEngagements,
  pbiOf,
  stakeholderName,
  withEngagements,
} from '@supportmanagement/services/support-pbi-service';
import { Building2 } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BlockIntro } from './support-pbi-examination-block.component';

interface EngagementsBlockProps {
  person: SupportStakeholderFormModel;
  writable: boolean;
  onChange: (person: SupportStakeholderFormModel) => void;
}

const engagementLine = (engagement: LegalEntityPersonEngagement): string =>
  [
    engagement.name,
    formatOrgNr(engagement.organizationNumber ?? '', OrgNumberFormat.DASH),
    personEngagementRoles(engagement),
  ]
    .filter(Boolean)
    .join(' - ');

export const EngagementsBlock: FC<EngagementsBlockProps> = ({ person, writable, onChange }) => {
  const { t } = useTranslation();
  const [read, setRead] = useState<LegalEntityPersonEngagement[]>();
  const [failed, setFailed] = useState(false);

  const partyId = person.externalId;
  const chosen = pbiOf(person).engagements;
  const engagements = read ?? [];
  const loading = !!partyId && !read && !failed;

  /** A company chosen before the company data changed is still named by its number. */
  const nameOf = (organizationNumber: string): string =>
    engagements.find((engagement) => engagement.organizationNumber === organizationNumber)?.name ||
    formatOrgNr(organizationNumber, OrgNumberFormat.DASH) ||
    organizationNumber;

  useEffect(() => {
    if (!partyId) return undefined;

    let reading = true;
    getLegalEntityPersonEngagements(partyId)
      .then((answer) => {
        if (reading) setRead(pbiEngagements(answer));
      })
      .catch(() => {
        if (reading) setFailed(true);
      });

    return () => {
      reading = false;
    };
  }, [partyId]);

  const choose = (picked: string[]) => onChange(withEngagements(person, picked));

  return (
    <div className="flex flex-col gap-8" data-cy={`pbi-engagements-${person.internalId}`}>
      <BlockIntro
        label={t('common:pbi_engagements.label')}
        description={t('common:pbi_engagements.description')}
        icon={<Building2 />}
      />

      {loading ? <Spinner size={2} aria-label={t('common:pbi_engagements.loading')} /> : null}

      {!loading && failed ? (
        <p className="text-small text-error-text-primary m-0" data-cy={`pbi-engagements-error-${person.internalId}`}>
          {t('common:pbi_engagements.error')}
        </p>
      ) : null}

      {!loading && !failed && engagements.length === 0 ? (
        <p className="text-small text-dark-secondary m-0" data-cy={`pbi-engagements-empty-${person.internalId}`}>
          {t('common:pbi_engagements.empty', { person: stakeholderName(person) })}
        </p>
      ) : null}

      {!loading && !failed && engagements.length > 0 ? (
        <FormControl className="w-full max-w-[48rem]">
          <FormLabel>{t('common:pbi_engagements.choose')}</FormLabel>
          <Combobox
            className="w-full"
            multiple
            size="sm"
            disabled={!writable}
            value={chosen}
            placeholder={t('common:pbi_engagements.placeholder')}
            searchPlaceholder={t('common:pbi_engagements.search')}
            data-cy={`pbi-engagements-select-${person.internalId}`}
            onSelect={(event) => choose((event.target.value as string[]) ?? [])}
          >
            <Combobox.Input className="w-full" disabled={!writable} />
            <Combobox.List>
              {engagements.map((engagement) => (
                <Combobox.Option
                  key={engagement.organizationNumber}
                  value={engagement.organizationNumber ?? ''}
                  disabled={!writable}
                  data-cy={`pbi-engagement-${person.internalId}-${engagement.organizationNumber}`}
                >
                  {engagementLine(engagement)}
                </Combobox.Option>
              ))}
            </Combobox.List>
          </Combobox>
        </FormControl>
      ) : null}

      {chosen.length > 0 ? (
        <div className="flex gap-8 flex-wrap" data-cy={`pbi-engagements-chosen-${person.internalId}`}>
          {chosen.map((organizationNumber) => (
            <Chip
              key={organizationNumber}
              className="text-small"
              disabled={!writable}
              aria-label={t('common:pbi_engagements.remove', { company: nameOf(organizationNumber) })}
              data-cy={`pbi-engagement-chosen-${person.internalId}-${organizationNumber}`}
              onClick={() => choose(chosen.filter((candidate) => candidate !== organizationNumber))}
            >
              {nameOf(organizationNumber)}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
};
