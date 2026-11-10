'use client';

import { searchPerson } from '@common/services/adress-service';
import { formatOrgNr, OrgNumberFormat } from '@common/services/helper-service';
import {
  getLegalEntityPersonEngagements,
  type LegalEntityPersonEngagement,
  personEngagementRoles,
} from '@common/services/legal-entity-service';
import { Chip, Combobox, FormControl, FormLabel, Spinner } from '@sk-web-gui/react';
import { pbiEngagements } from '@supportmanagement/services/support-pbi-service';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ChosenCompany {
  organizationNumber: string;
  name: string;
}

interface CompanyEngagementChoiceProps {
  partyId: string | undefined;
  personalNumber?: string;
  personName: string;
  chosen: string[];
  writable: boolean;
  onChange: (companies: ChosenCompany[]) => void;
  textKey: string;
  dataCy: string;
}

const engagementLine = (engagement: LegalEntityPersonEngagement): string =>
  [
    engagement.name,
    formatOrgNr(engagement.organizationNumber ?? '', OrgNumberFormat.DASH),
    personEngagementRoles(engagement),
  ]
    .filter(Boolean)
    .join(' - ');

export const CompanyEngagementChoice: FC<CompanyEngagementChoiceProps> = ({
  partyId,
  personalNumber,
  personName,
  chosen,
  writable,
  onChange,
  textKey,
  dataCy,
}) => {
  const { t } = useTranslation();
  const [read, setRead] = useState<LegalEntityPersonEngagement[]>();
  const [failed, setFailed] = useState(false);
  const [found, setFound] = useState<string>();
  const [notFound, setNotFound] = useState(false);

  const identity = partyId ?? found;
  const lookingUp = !partyId && !!personalNumber && !found && !notFound;
  const reading = !!identity && !read && !failed;
  const loading = lookingUp || reading;
  const unknown = !identity && !lookingUp;

  const engagements = read ?? [];

  const nameOf = (organizationNumber: string): string =>
    engagements.find((engagement) => engagement.organizationNumber === organizationNumber)?.name ||
    formatOrgNr(organizationNumber, OrgNumberFormat.DASH) ||
    organizationNumber;

  useEffect(() => {
    if (partyId || !personalNumber) return undefined;

    let looking = true;
    searchPerson(personalNumber)
      .then((person) => {
        if (!looking) return;
        if (person?.personId) setFound(person.personId);
        else setNotFound(true);
      })
      .catch(() => {
        if (looking) setNotFound(true);
      });

    return () => {
      looking = false;
    };
  }, [partyId, personalNumber]);

  useEffect(() => {
    if (!identity) return undefined;

    let reading = true;
    getLegalEntityPersonEngagements(identity)
      .then((answer) => {
        if (reading) setRead(pbiEngagements(answer));
      })
      .catch(() => {
        if (reading) setFailed(true);
      });

    return () => {
      reading = false;
    };
  }, [identity]);

  const choose = (picked: string[]) => {
    const unchanged = picked.length === chosen.length && picked.every((number) => chosen.includes(number));
    if (unchanged) return;

    onChange(picked.map((organizationNumber) => ({ organizationNumber, name: nameOf(organizationNumber) })));
  };

  const ifLoading = loading ? <Spinner size={2} aria-label={t(`${textKey}.loading`)} /> : null;

  const ifError =
    !loading && failed ? (
      <p className="text-small text-error-text-primary m-0" data-cy={`${dataCy}-error`}>
        {t(`${textKey}.error`)}
      </p>
    ) : null;

  const ifUnknown =
    !loading && unknown ? (
      <p className="text-small text-dark-secondary m-0" data-cy={`${dataCy}-unknown`}>
        {t(`${textKey}.unknown`, { person: personName })}
      </p>
    ) : null;

  const ifEmpty =
    !loading && !failed && !unknown && engagements.length === 0 ? (
      <p className="text-small text-dark-secondary m-0" data-cy={`${dataCy}-empty`}>
        {t(`${textKey}.empty`, { person: personName })}
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-8 mt-8" data-cy={dataCy}>
      {ifLoading}
      {ifError}
      {ifUnknown}
      {ifEmpty}
      {!loading && !failed && !unknown && engagements.length > 0 ? (
        <FormControl className="w-full max-w-[48rem]">
          <FormLabel>{t(`${textKey}.choose`)}</FormLabel>
          <Combobox
            className="w-full"
            multiple
            size="sm"
            disabled={!writable}
            value={chosen}
            placeholder={t(`${textKey}.placeholder`)}
            searchPlaceholder={t(`${textKey}.search`)}
            data-cy={`${dataCy}-select`}
            onSelect={(event) => choose((event.target.value as string[]) ?? [])}
          >
            <Combobox.Input className="w-full" disabled={!writable} />
            <Combobox.List>
              {engagements.map((engagement) => (
                <Combobox.Option
                  key={engagement.organizationNumber}
                  value={engagement.organizationNumber ?? ''}
                  disabled={!writable}
                  data-cy={`${dataCy}-option-${engagement.organizationNumber}`}
                >
                  {engagementLine(engagement)}
                </Combobox.Option>
              ))}
            </Combobox.List>
          </Combobox>
        </FormControl>
      ) : null}

      {chosen.length > 0 ? (
        <div className="flex gap-8 flex-wrap" data-cy={`${dataCy}-chosen`}>
          {chosen.map((organizationNumber) => (
            <Chip
              key={organizationNumber}
              className="text-small"
              disabled={!writable}
              aria-label={t(`${textKey}.remove`, { company: nameOf(organizationNumber) })}
              data-cy={`${dataCy}-chip-${organizationNumber}`}
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
