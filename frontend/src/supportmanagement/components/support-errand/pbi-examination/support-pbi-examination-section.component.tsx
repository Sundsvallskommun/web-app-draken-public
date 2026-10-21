'use client';

import { Alert, FormControl, FormLabel, Input, Select, Textarea } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  isOrganizationExternalIdType,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import {
  hyphenatedIdentity,
  PBI_ASSESSMENTS,
  PBI_KNOWLEDGE_TEST_STATUSES,
  PbiAssessmentName,
  PbiKnowledgeTest,
  PbiKnowledgeTestStatusName,
  pbiOf,
  pbiProblem,
  pbiRoles,
  stakeholderName,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
  withAssessment,
  withKnowledgeTest,
} from '@supportmanagement/services/support-pbi-service';
import { FC, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

import { AddPbiButton } from '../pbi/support-add-pbi-button.component';
import { SupportPbiAddDialog } from '../pbi/support-pbi-add-dialog.component';
import { useSupportPbi } from '../tabs/use-support-pbi';

interface BlockProps {
  person: SupportStakeholderFormModel;
  writable: boolean;
  onChange: (person: SupportStakeholderFormModel) => void;
}

const PersonHeading: FC<{ person: SupportStakeholderFormModel; engagements: LegalEntityEngagement[] }> = ({
  person,
  engagements,
}) => (
  <div className="flex flex-col min-w-0">
    <span className="font-semibold truncate">{stakeholderName(person)}</span>
    <span className="text-small text-dark-secondary">
      {[hyphenatedIdentity(person.personNumber), pbiRoles(person, engagements)].filter(Boolean).join(' · ')}
    </span>
  </div>
);

const BlockIntro: FC<{ label: string; description: string }> = ({ label, description }) => (
  <p className="text-small m-0">
    <span className="font-bold">{label}</span> - {description}
  </p>
);

const BlockFields: FC<{ comment: ReactNode; controls: ReactNode }> = ({ comment, controls }) => (
  <div className="flex items-end gap-16 flex-wrap">
    <div className="grow basis-[24rem]">{comment}</div>
    <div className="flex flex-col gap-8 shrink-0">{controls}</div>
  </div>
);

const SuitabilityBlock: FC<BlockProps> = ({ person, writable, onChange }) => {
  const { t } = useTranslation();
  const name = stakeholderName(person);
  const { assessment, comment } = pbiOf(person);
  const problem = pbiProblem(person);

  return (
    <div className="flex flex-col gap-8">
      <BlockIntro
        label={t('common:personal_suitability.label')}
        description={t('common:personal_suitability.description')}
      />
      <BlockFields
        comment={
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
        }
        controls={
          <Select
            className="w-[22rem]"
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
        }
      />
      {problem ? (
        <p className="text-small text-error-text-primary m-0" data-cy={`suitability-problem-${person.internalId}`}>
          {t(problem)}
        </p>
      ) : null}
    </div>
  );
};

const KnowledgeTestBlock: FC<BlockProps> = ({ person, writable, onChange }) => {
  const { t } = useTranslation();
  const name = stakeholderName(person);
  const { knowledgeTest } = pbiOf(person);
  const write = (changes: Partial<PbiKnowledgeTest>) =>
    onChange(withKnowledgeTest(person, { ...knowledgeTest, ...changes }));

  return (
    <div className="flex flex-col gap-8">
      <BlockIntro label={t('common:knowledge_test.label')} description={t('common:knowledge_test.description')} />
      <BlockFields
        comment={
          <FormControl className="w-full">
            <FormLabel>{t('common:knowledge_test.comment')}</FormLabel>
            <Textarea
              className="w-full"
              rows={3}
              maxLength={SUPPORT_PARAMETER_VALUE_MAX_LENGTH}
              maxLengthWarningText={t('common:knowledge_test.comment_too_long')}
              value={knowledgeTest.comment}
              disabled={!writable}
              data-cy={`knowledge-test-comment-${person.internalId}`}
              placeholder={t('common:knowledge_test.comment_placeholder', { person: name })}
              onChange={(e) => write({ comment: e.currentTarget.value })}
            />
          </FormControl>
        }
        controls={
          <>
            <Select
              className="w-[22rem]"
              value={knowledgeTest.status}
              disabled={!writable}
              data-cy={`knowledge-test-status-${person.internalId}`}
              aria-label={t('common:knowledge_test.status_for', { person: name })}
              onChange={(e) => write({ status: e.currentTarget.value as PbiKnowledgeTestStatusName | '' })}
            >
              <Select.Option value="">{t('common:knowledge_test.status_placeholder')}</Select.Option>
              {PBI_KNOWLEDGE_TEST_STATUSES.map((candidate) => (
                <Select.Option key={candidate.status} value={candidate.status}>
                  {t(candidate.translationKey)}
                </Select.Option>
              ))}
            </Select>
            <Input
              type="date"
              className="w-[22rem]"
              value={knowledgeTest.testedAt}
              disabled={!writable}
              data-cy={`knowledge-test-date-${person.internalId}`}
              aria-label={t('common:knowledge_test.tested_at_for', { person: name })}
              onChange={(e) => write({ testedAt: e.currentTarget.value })}
            />
          </>
        }
      />
    </div>
  );
};

const PersonCard: FC<BlockProps & { engagements: LegalEntityEngagement[] }> = ({
  person,
  engagements,
  writable,
  onChange,
}) => (
  <div className="border-1 rounded-groups p-16 flex flex-col gap-16" data-cy={`pbi-examination-${person.internalId}`}>
    <PersonHeading person={person} engagements={engagements} />
    <SuitabilityBlock person={person} writable={writable} onChange={onChange} />
    <KnowledgeTestBlock person={person} writable={writable} onChange={onChange} />
  </div>
);

/**
 * One card per person marked on the errand, carrying both the personal suitability and the knowledge test, since
 * both are judgements about the same person. Both are written onto the stakeholder in the form and saved by Spara
 * ärende, so the card has no state of its own: what it shows is what the form holds.
 */
export const SupportPbiExaminationSection: FC<{ writable: boolean }> = ({ writable }) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const [adding, setAdding] = useState(false);

  const organizationPartyId = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && isOrganizationExternalIdType(stakeholder.externalIdType)
  )?.externalId;
  const pbi = useSupportPbi(organizationPartyId);
  const canWrite = writable && pbi.canEdit;

  return (
    <div className="flex flex-col gap-16" data-cy="pbi-examination-section">
      {pbi.people.length === 0 ? (
        <Alert type="info" data-cy="pbi-examination-empty">
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
