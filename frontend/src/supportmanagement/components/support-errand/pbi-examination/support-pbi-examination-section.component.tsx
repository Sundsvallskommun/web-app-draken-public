'use client';

import { Alert, Button, FormControl, FormLabel, Input, Select, Textarea } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { supportInvestigationTextKeys } from '@supportmanagement/services/support-investigation-sections';
import {
  emptyKnowledgeTest,
  hyphenatedIdentity,
  knowledgeTestTypeChoice,
  PBI_ASSESSMENTS,
  PBI_KNOWLEDGE_TEST_STATUSES,
  PBI_KNOWLEDGE_TEST_TYPE_MAX_LENGTH,
  PBI_KNOWLEDGE_TEST_TYPE_OTHER,
  PBI_KNOWLEDGE_TEST_TYPES,
  PbiAssessmentName,
  PbiKnowledgeTest,
  PbiKnowledgeTestStatusName,
  pbiOf,
  pbiProblem,
  pbiRoles,
  stakeholderName,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
  withAssessment,
  withKnowledgeTests,
  withMotivation,
} from '@supportmanagement/services/support-pbi-service';
import { Plus, Trash2 } from 'lucide-react';
import { FC, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';
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
  <p className="m-0">
    <span className="font-bold">{label}</span> - {description}
  </p>
);

const BlockFields: FC<{ comment: ReactNode; controls: ReactNode }> = ({ comment, controls }) => (
  <div className="flex items-end gap-16 flex-wrap">
    <div className="grow basis-[24rem]">{comment}</div>
    <div className="flex flex-col gap-8 shrink-0">{controls}</div>
  </div>
);

const MotivationBlock: FC<BlockProps> = ({ person, writable, onChange }) => {
  const { t } = useTranslation();
  const { motivation } = pbiOf(person);

  return (
    <FormControl className="w-full">
      <FormLabel className="text-small">{t('common:pbi_motivation.label')}</FormLabel>
      <Textarea
        className="w-full"
        rows={2}
        maxLength={SUPPORT_PARAMETER_VALUE_MAX_LENGTH}
        maxLengthWarningText={t('common:pbi_motivation.too_long')}
        value={motivation}
        disabled={!writable}
        data-cy={`pbi-motivation-${person.internalId}`}
        placeholder={t('common:pbi_motivation.placeholder', { person: stakeholderName(person) })}
        onChange={(e) => onChange(withMotivation(person, e.currentTarget.value))}
      />
    </FormControl>
  );
};

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
            <FormLabel className="text-small">{t('common:personal_suitability.comment')}</FormLabel>
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

const KnowledgeTestCard: FC<{
  person: SupportStakeholderFormModel;
  number: number;
  test: PbiKnowledgeTest;
  writable: boolean;
  onChange: (changes: Partial<PbiKnowledgeTest>) => void;
  onRemove: () => void;
}> = ({ person, number, test, writable, onChange, onRemove }) => {
  const { t } = useTranslation();
  const [otherChosen, setOtherChosen] = useState(false);
  const forPerson = { person: stakeholderName(person), number };
  const choice = knowledgeTestTypeChoice(test.type);
  const other = choice === PBI_KNOWLEDGE_TEST_TYPE_OTHER || (otherChosen && !test.type);
  const cy = (part: string) => `knowledge-test-${part}-${person.internalId}-${number}`;

  const chooseType = (chosen: string) => {
    setOtherChosen(chosen === PBI_KNOWLEDGE_TEST_TYPE_OTHER);
    onChange({ type: chosen === PBI_KNOWLEDGE_TEST_TYPE_OTHER ? '' : chosen });
  };

  return (
    <div className="border-1 rounded-groups p-12 flex flex-col gap-8" data-cy={cy('card')}>
      <div className="flex items-end gap-16 flex-wrap">
        <FormControl className="grow basis-[22rem]">
          <FormLabel>{t('common:knowledge_test.type')}</FormLabel>
          <Select
            value={choice}
            disabled={!writable}
            data-cy={cy('type')}
            aria-label={t('common:knowledge_test.type_for', forPerson)}
            onChange={(e) => chooseType(e.currentTarget.value)}
          >
            <Select.Option value="">{t('common:knowledge_test.type_placeholder')}</Select.Option>
            {PBI_KNOWLEDGE_TEST_TYPES.map((candidate) => (
              <Select.Option key={candidate.type} value={candidate.type}>
                {t(candidate.translationKey)}
              </Select.Option>
            ))}
            <Select.Option value={PBI_KNOWLEDGE_TEST_TYPE_OTHER}>{t('common:knowledge_test.type_other')}</Select.Option>
          </Select>
        </FormControl>

        {other ? (
          <FormControl className="grow basis-[22rem]">
            <FormLabel>{t('common:knowledge_test.own_type')}</FormLabel>
            <Input
              value={test.type}
              maxLength={PBI_KNOWLEDGE_TEST_TYPE_MAX_LENGTH}
              disabled={!writable}
              data-cy={cy('own-type')}
              placeholder={t('common:knowledge_test.own_type_placeholder')}
              onChange={(e) => onChange({ type: e.currentTarget.value })}
            />
          </FormControl>
        ) : null}

        <Select
          className="w-[16rem]"
          value={test.status}
          disabled={!writable}
          data-cy={cy('status')}
          aria-label={t('common:knowledge_test.status_for', forPerson)}
          onChange={(e) => onChange({ status: e.currentTarget.value as PbiKnowledgeTestStatusName | '' })}
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
          className="w-[16rem]"
          value={test.testedAt}
          disabled={!writable}
          data-cy={cy('date')}
          aria-label={t('common:knowledge_test.tested_at_for', forPerson)}
          onChange={(e) => onChange({ testedAt: e.currentTarget.value })}
        />

        <Button
          type="button"
          iconButton
          variant="tertiary"
          color="error"
          disabled={!writable}
          aria-label={t('common:knowledge_test.remove', forPerson)}
          title={t('common:knowledge_test.remove', forPerson)}
          data-cy={cy('remove')}
          onClick={onRemove}
        >
          <Trash2 size={20} />
        </Button>
      </div>

      <FormControl className="w-full">
        <FormLabel>{t('common:knowledge_test.comment')}</FormLabel>
        <Textarea
          className="w-full"
          rows={2}
          maxLength={SUPPORT_PARAMETER_VALUE_MAX_LENGTH}
          maxLengthWarningText={t('common:knowledge_test.comment_too_long')}
          value={test.comment}
          disabled={!writable}
          data-cy={cy('comment')}
          placeholder={t('common:knowledge_test.comment_placeholder', forPerson)}
          onChange={(e) => onChange({ comment: e.currentTarget.value })}
        />
      </FormControl>
    </div>
  );
};

const KnowledgeTestBlock: FC<BlockProps> = ({ person, writable, onChange }) => {
  const { t } = useTranslation();
  const { knowledgeTests } = pbiOf(person);
  const write = (tests: PbiKnowledgeTest[]) => onChange(withKnowledgeTests(person, tests));

  return (
    <div className="flex flex-col gap-8">
      <BlockIntro label={t('common:knowledge_test.label')} description={t('common:knowledge_test.description')} />

      {knowledgeTests.length === 0 ? (
        <p className="text-small text-dark-secondary m-0" data-cy={`knowledge-test-empty-${person.internalId}`}>
          {t('common:knowledge_test.empty')}
        </p>
      ) : null}

      {knowledgeTests.map((test, index) => (
        <KnowledgeTestCard
          key={index}
          person={person}
          number={index + 1}
          test={test}
          writable={writable}
          onChange={(changes) =>
            write(
              knowledgeTests.map((candidate, position) =>
                position === index ? { ...candidate, ...changes } : candidate
              )
            )
          }
          onRemove={() => write(knowledgeTests.filter((_, position) => position !== index))}
        />
      ))}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!writable}
          leftIcon={<Plus size={18} />}
          data-cy={`knowledge-test-add-${person.internalId}`}
          onClick={() => write([...knowledgeTests, emptyKnowledgeTest()])}
        >
          {t('common:knowledge_test.add')}
        </Button>
      </div>
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
    <MotivationBlock person={person} writable={writable} onChange={onChange} />
    <SuitabilityBlock person={person} writable={writable} onChange={onChange} />
    <KnowledgeTestBlock person={person} writable={writable} onChange={onChange} />
  </div>
);

/**
 * The ownership of the company, and one card per person marked on the errand carrying the motivation, the personal
 * suitability and the knowledge test, since all three are about the same person. The cards are written onto the
 * stakeholders in the form and saved by Spara ärende, so they have no state of their own: what they show is what
 * the form holds. The ownership is the text of the section itself.
 */
export const SupportPbiExaminationSection: FC<InvestigationSectionProps> = (props) => {
  const { writable } = props;
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const [adding, setAdding] = useState(false);

  const organizationPartyId = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY'
  )?.externalId;
  const pbi = useSupportPbi(organizationPartyId);
  const canWrite = writable && pbi.canEdit;

  return (
    <div className="flex flex-col gap-24" data-cy="pbi-examination-section">
      <InvestigationSectionText
        {...props}
        name="persons_of_influence"
        {...supportInvestigationTextKeys('persons_of_influence')}
      />

      <div className="flex flex-col gap-16">
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
      </div>

      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={pbi.addByHand} />
    </div>
  );
};
