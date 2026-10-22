'use client';

import { Button, FormControl, FormLabel, Input, Select, Textarea } from '@sk-web-gui/react';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import {
  knowledgeTestTypeChoice,
  PBI_KNOWLEDGE_TEST_STATUSES,
  PBI_KNOWLEDGE_TEST_TYPE_MAX_LENGTH,
  PBI_KNOWLEDGE_TEST_TYPE_OTHER,
  PBI_KNOWLEDGE_TEST_TYPES,
  PbiKnowledgeTest,
  PbiKnowledgeTestStatusName,
  stakeholderName,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
} from '@supportmanagement/services/support-pbi-service';
import { Trash2 } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface KnowledgeTestCardProps {
  person: SupportStakeholderFormModel;
  number: number;
  test: PbiKnowledgeTest;
  writable: boolean;
  onChange: (changes: Partial<PbiKnowledgeTest>) => void;
  onRemove: () => void;
}

export const KnowledgeTestCard: FC<KnowledgeTestCardProps> = ({
  person,
  number,
  test,
  writable,
  onChange,
  onRemove,
}) => {
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
