'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { Alert, FormControl, FormLabel, Input, Select, Spinner, Textarea, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  getSupportKnowledgeTestPeople,
  saveSupportKnowledgeTest,
  SUPPORT_KNOWLEDGE_TEST_STATUSES,
  type SupportKnowledgeTestPerson,
  supportKnowledgeTestRecord,
  type SupportKnowledgeTestStatusName,
} from '@supportmanagement/services/support-knowledge-test-service';
import { SUPPORT_PARAMETER_VALUE_MAX_LENGTH } from '@supportmanagement/services/support-pbi-service';
import { FC, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddPbiButton } from '../pbi/support-add-pbi-button.component';
import { SupportPbiAddDialog } from '../pbi/support-pbi-add-dialog.component';
import { SupportPbiRemoveButton } from '../pbi/support-pbi-remove-button.component';
import { useAddSupportPbiByHand } from '../pbi/use-add-support-pbi-by-hand';
import { useRemoveSupportPbi } from '../pbi/use-remove-support-pbi';

const PersonCard: FC<{
  person: SupportKnowledgeTestPerson;
  writable: boolean;
  onStatus: (status: SupportKnowledgeTestStatusName | '') => void;
  onTestedAt: (testedAt: string) => void;
  onComment: (comment: string) => void;
  onRemove: () => void;
}> = ({ person, writable, onStatus, onTestedAt, onComment, onRemove }) => {
  const { t } = useTranslation();

  return (
    <div className="border-1 rounded-groups p-16 flex flex-col gap-12" data-cy={`knowledge-test-${person.partyId}`}>
      <div className="flex items-start justify-between gap-16 flex-wrap">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate">{person.name}</span>
          <span className="text-small text-dark-secondary">
            {[person.identityCode, person.roles].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="flex items-center gap-8 shrink-0">
          <Select
            className="w-[18rem]"
            value={person.status}
            disabled={!writable}
            data-cy={`knowledge-test-status-${person.partyId}`}
            aria-label={t('common:knowledge_test.status_for', { person: person.name })}
            onChange={(e) => onStatus(e.currentTarget.value as SupportKnowledgeTestStatusName | '')}
          >
            <Select.Option value="">{t('common:knowledge_test.status_placeholder')}</Select.Option>
            {SUPPORT_KNOWLEDGE_TEST_STATUSES.map((candidate) => (
              <Select.Option key={candidate.status} value={candidate.status}>
                {t(candidate.translationKey)}
              </Select.Option>
            ))}
          </Select>
          <Input
            type="date"
            className="w-[16rem]"
            value={person.testedAt}
            disabled={!writable}
            data-cy={`knowledge-test-date-${person.partyId}`}
            aria-label={t('common:knowledge_test.tested_at_for', { person: person.name })}
            onChange={(e) => onTestedAt(e.currentTarget.value)}
          />
          <SupportPbiRemoveButton
            name={person.name}
            addedByHand={person.addedByHand}
            disabled={!writable}
            dataCy={`knowledge-test-remove-${person.partyId}`}
            onRemove={onRemove}
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
          value={person.comment}
          disabled={!writable}
          data-cy={`knowledge-test-comment-${person.partyId}`}
          placeholder={t('common:knowledge_test.comment_placeholder', { person: person.name })}
          onChange={(e) => onComment(e.currentTarget.value)}
        />
      </FormControl>
    </div>
  );
};

export const SupportKnowledgeTestSection: FC<{
  writable: boolean;
  onEdited: (edited: boolean) => void;
  saveRef: MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({ writable, onEdited, saveRef }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [people, setPeople] = useState<SupportKnowledgeTestPerson[]>();
  const [loaded, setLoaded] = useState<SupportKnowledgeTestPerson[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const errandId = supportErrand?.id;
  const pbiSignal = useSupportStore((s) => s.pbiSignal);
  const pbiSignalAt = pbiSignal?.errandId === errandId ? pbiSignal?.at : undefined;

  /** A person who was already on the card keeps whatever the handler has typed but not yet saved. */
  const absorb = useCallback((read: SupportKnowledgeTestPerson[]) => {
    setLoaded(read);
    setPeople((current) => read.map((person) => current?.find((held) => held.partyId === person.partyId) ?? person));
  }, []);

  useEffect(() => {
    if (!errandId) return;

    let abandoned = false;
    getSupportKnowledgeTestPeople(errandId, municipalityId)
      .then((read) => {
        if (!abandoned) absorb(read);
      })
      .catch(() => {
        if (!abandoned) absorb([]);
      });

    return () => {
      abandoned = true;
    };
  }, [errandId, municipalityId, absorb, pbiSignalAt]);

  const addByHand = useAddSupportPbiByHand();
  const remove = useRemoveSupportPbi();

  const change = (partyId: string, changes: Partial<SupportKnowledgeTestPerson>) =>
    setPeople((current) =>
      (current ?? []).map((person) => (person.partyId === partyId ? { ...person, ...changes } : person))
    );

  const isEdited = (person: SupportKnowledgeTestPerson): boolean => {
    const before = loaded.find((held) => held.partyId === person.partyId);
    return (
      !before ||
      before.status !== person.status ||
      before.testedAt !== person.testedAt ||
      before.comment !== person.comment
    );
  };

  const edited = (people ?? []).some(isEdited);

  useEffect(() => {
    onEdited(edited);
  }, [edited, onEdited]);

  const saveAll = useCallback(async (): Promise<boolean> => {
    const changed = (people ?? []).filter(isEdited);
    if (!errandId || changed.length === 0) return true;

    setBusy(true);
    try {
      for (const person of changed) {
        await saveSupportKnowledgeTest(errandId, municipalityId, person.partyId, supportKnowledgeTestRecord(person));
      }
      setLoaded(people ?? []);
      return true;
    } catch {
      toastMessage(getToastOptions({ message: t('common:knowledge_test.toast.save_failed'), status: 'error' }));
      return false;
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, loaded, errandId, municipalityId, t, toastMessage]);

  useEffect(() => {
    saveRef.current = saveAll;
  }, [saveAll, saveRef]);

  if (!people) {
    return (
      <div className="flex items-center gap-12 text-dark-secondary" data-cy="knowledge-test-loading">
        <Spinner size={2} /> {t('common:knowledge_test.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16" data-cy="knowledge-test-section">
      <p className="text-dark-secondary m-0">{t('common:knowledge_test.description')}</p>

      {people.length === 0 ? (
        <Alert type="info" data-cy="knowledge-test-empty">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{t('common:knowledge_test.empty')}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {people.map((person) => (
        <PersonCard
          key={person.partyId}
          person={person}
          writable={writable && !busy}
          onStatus={(status) => change(person.partyId, { status })}
          onTestedAt={(testedAt) => change(person.partyId, { testedAt })}
          onComment={(comment) => change(person.partyId, { comment })}
          onRemove={() => remove(person.partyId)}
        />
      ))}

      {writable ? (
        <AddPbiButton disabled={busy} onClick={() => setAdding(true)} label={t('common:company.pbi.add.open')} />
      ) : null}

      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={addByHand} />
    </div>
  );
};
