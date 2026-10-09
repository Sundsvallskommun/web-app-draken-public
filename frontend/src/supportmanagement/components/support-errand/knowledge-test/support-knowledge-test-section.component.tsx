'use client';

import { Alert, FormControl, FormLabel, Input, Select, Textarea } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import {
  hyphenatedIdentity,
  PBI_KNOWLEDGE_TEST_STATUSES,
  PbiKnowledgeTest,
  PbiKnowledgeTestStatusName,
  pbiOf,
  pbiRoles,
  stakeholderName,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
  withKnowledgeTest,
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
  const { knowledgeTest } = pbiOf(person);
  const write = (changes: Partial<PbiKnowledgeTest>) =>
    onChange(withKnowledgeTest(person, { ...knowledgeTest, ...changes }));

  return (
    <div className="border-1 rounded-groups p-16 flex flex-col gap-12" data-cy={`knowledge-test-${person.internalId}`}>
      <div className="flex items-start justify-between gap-16 flex-wrap">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate">{name}</span>
          <span className="text-small text-dark-secondary">
            {[hyphenatedIdentity(person.personNumber), pbiRoles(person, engagements)].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="flex items-center gap-8 shrink-0">
          <Select
            className="w-[18rem]"
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
            className="w-[16rem]"
            value={knowledgeTest.testedAt}
            disabled={!writable}
            data-cy={`knowledge-test-date-${person.internalId}`}
            aria-label={t('common:knowledge_test.tested_at_for', { person: name })}
            onChange={(e) => write({ testedAt: e.currentTarget.value })}
          />
        </div>
      </div>
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
    </div>
  );
};

/**
 * One card per person marked on the errand. The knowledge test is written onto the stakeholder in the form and
 * saved by Spara ärende, so the card has no state of its own: what it shows is what the form holds.
 */
export const SupportKnowledgeTestSection: FC<{ writable: boolean }> = ({ writable }) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const [adding, setAdding] = useState(false);

  const organizationPartyId = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY'
  )?.externalId;
  const pbi = useSupportPbi(organizationPartyId);
  const canWrite = writable && pbi.canEdit;

  return (
    <div className="flex flex-col gap-16" data-cy="knowledge-test-section">
      <p className="text-dark-secondary m-0">{t('common:knowledge_test.description')}</p>

      {pbi.people.length === 0 ? (
        <Alert type="info" data-cy="knowledge-test-empty">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{t('common:knowledge_test.empty')}</Alert.Content.Description>
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
