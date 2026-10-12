'use client';

import { Alert, FormControl, FormLabel, Select, Textarea } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import {
  hyphenatedIdentity,
  PBI_ASSESSMENTS,
  PbiAssessmentName,
  pbiOf,
  pbiProblem,
  pbiRoles,
  stakeholderName,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
  withAssessment,
} from '@supportmanagement/services/support-pbi-service';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

import { AddPbiButton } from '../pbi/support-add-pbi-button.component';
import { SupportPbiAddDialog } from '../pbi/support-pbi-add-dialog.component';
import { useSupportPbi } from '../tabs/use-support-pbi';

const PersonCard: FC<{
  person: SupportStakeholderFormModel;
  engagements: LegalEntityEngagement[];
  writable: boolean;
  onChange: (person: SupportStakeholderFormModel) => void;
}> = ({ person, engagements, writable, onChange }) => {
  const { t } = useTranslation();
  const name = stakeholderName(person);
  const { assessment, comment } = pbiOf(person);
  const problem = pbiProblem(person);

  return (
    <div className="border-1 rounded-groups p-16 flex flex-col gap-12" data-cy={`suitability-${person.internalId}`}>
      <div className="flex items-start justify-between gap-16">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate">{name}</span>
          <span className="text-small text-dark-secondary">
            {[hyphenatedIdentity(person.personNumber), pbiRoles(person, engagements)].filter(Boolean).join(' · ')}
          </span>
        </div>
        <Select
          className="w-[22rem] shrink-0"
          value={assessment}
          disabled={!writable}
          data-cy={`suitability-assessment-${person.internalId}`}
          aria-label={t('common:personal_suitability.assessment_for', { person: name })}
          onChange={(e) =>
            onChange(withAssessment(person, { assessment: e.currentTarget.value as PbiAssessmentName, comment }))
          }
        >
          <Select.Option value="">{t('common:personal_suitability.assessment_placeholder')}</Select.Option>
          {PBI_ASSESSMENTS.map((candidate) => (
            <Select.Option key={candidate.assessment} value={candidate.assessment}>
              {t(candidate.translationKey)}
            </Select.Option>
          ))}
        </Select>
      </div>
      <FormControl className="w-full" invalid={!!problem}>
        <FormLabel>{t('common:personal_suitability.comment')}</FormLabel>
        <Textarea
          className="w-full"
          rows={3}
          maxLength={SUPPORT_PARAMETER_VALUE_MAX_LENGTH}
          maxLengthWarningText={t('common:personal_suitability.comment_too_long')}
          value={comment}
          disabled={!writable}
          data-cy={`suitability-comment-${person.internalId}`}
          placeholder={t('common:personal_suitability.comment_placeholder', { person: name })}
          onChange={(e) => onChange(withAssessment(person, { assessment, comment: e.currentTarget.value }))}
        />
      </FormControl>
      {problem ? (
        <p className="text-small text-error-text-primary m-0" data-cy={`suitability-problem-${person.internalId}`}>
          {t(problem)}
        </p>
      ) : null}
    </div>
  );
};

/**
 * One card per person marked on the errand. The verdict is written onto the stakeholder in the form and saved by
 * Spara ärende, so the card has no state of its own: what it shows is what the form holds.
 */
export const SupportPersonalSuitabilitySection: FC<{ writable: boolean }> = ({ writable }) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const [adding, setAdding] = useState(false);

  const organizationPartyId = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY'
  )?.externalId;
  const pbi = useSupportPbi(organizationPartyId);
  const canWrite = writable && pbi.canEdit;

  return (
    <div className="flex flex-col gap-16" data-cy="personal-suitability-section">
      <p className="text-dark-secondary m-0">{t('common:personal_suitability.description')}</p>

      {pbi.people.length === 0 ? (
        <Alert type="info" data-cy="suitability-empty">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{t('common:personal_suitability.empty')}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {pbi.people.map((person) => (
        <PersonCard
          key={person.internalId}
          person={person}
          engagements={pbi.engagements}
          writable={canWrite}
          onChange={pbi.replace}
        />
      ))}

      {canWrite ? (
        <AddPbiButton disabled={false} onClick={() => setAdding(true)} label={t('common:company.pbi.add.open')} />
      ) : null}

      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={pbi.addByHand} />
    </div>
  );
};
