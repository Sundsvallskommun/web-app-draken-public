'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { Alert, Button, FormControl, FormLabel, Select, Spinner, Textarea, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  assessSupportSuitability,
  getSupportSuitabilityPeople,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
  SUPPORT_SUITABILITY_ASSESSMENTS,
  type SupportSuitabilityAssessmentName,
  type SupportSuitabilityPerson,
} from '@supportmanagement/services/support-personal-suitability-service';
import { UserPlus } from 'lucide-react';
import { FC, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportPbiAddDialog } from '../pbi/support-pbi-add-dialog.component';
import { useAddSupportPbiByHand } from '../pbi/use-add-support-pbi-by-hand';

const PersonCard: FC<{
  person: SupportSuitabilityPerson;
  writable: boolean;
  problem: string | undefined;
  onAssessment: (assessment: SupportSuitabilityAssessmentName) => void;
  onComment: (comment: string) => void;
}> = ({ person, writable, problem, onAssessment, onComment }) => {
  const { t } = useTranslation();

  return (
    <div className="border-1 rounded-groups p-16 flex flex-col gap-12" data-cy={`suitability-${person.partyId}`}>
      <div className="flex items-start justify-between gap-16">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate">{person.name}</span>
          <span className="text-small text-dark-secondary">
            {[person.identityCode, person.roles].filter(Boolean).join(' · ')}
          </span>
        </div>
        <Select
          className="w-[22rem] shrink-0"
          value={person.assessment}
          disabled={!writable}
          data-cy={`suitability-assessment-${person.partyId}`}
          aria-label={t('common:personal_suitability.assessment_for', { person: person.name })}
          onChange={(e) => onAssessment(e.currentTarget.value as SupportSuitabilityAssessmentName)}
        >
          <Select.Option value="">{t('common:personal_suitability.assessment_placeholder')}</Select.Option>
          {SUPPORT_SUITABILITY_ASSESSMENTS.map((candidate) => (
            <Select.Option key={candidate.assessment} value={candidate.assessment}>
              {t(candidate.translationKey)}
            </Select.Option>
          ))}
        </Select>
      </div>
      <FormControl className="w-full">
        <FormLabel>{t('common:personal_suitability.comment')}</FormLabel>
        <Textarea
          className="w-full"
          rows={3}
          maxLength={SUPPORT_PARAMETER_VALUE_MAX_LENGTH}
          maxLengthWarningText={t('common:personal_suitability.comment_too_long')}
          value={person.comment}
          disabled={!writable}
          data-cy={`suitability-comment-${person.partyId}`}
          placeholder={t('common:personal_suitability.comment_placeholder', { person: person.name })}
          onChange={(e) => onComment(e.currentTarget.value)}
        />
      </FormControl>
      {problem ? (
        <p className="text-small text-error-text-primary m-0" data-cy={`suitability-problem-${person.partyId}`}>
          {t(problem)}
        </p>
      ) : null}
    </div>
  );
};

export const SupportPersonalSuitabilitySection: FC<{
  writable: boolean;
  onEdited: (edited: boolean) => void;
  saveRef: MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({ writable, onEdited, saveRef }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [people, setPeople] = useState<SupportSuitabilityPerson[]>();
  const [loaded, setLoaded] = useState<SupportSuitabilityPerson[]>([]);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const errandId = supportErrand?.id;
  const pbiSignal = useSupportStore((s) => s.pbiSignal);
  const pbiSignalAt = pbiSignal?.errandId === errandId ? pbiSignal?.at : undefined;

  /** A person who was already on the card keeps whatever the handler has typed but not yet saved. */
  const absorb = useCallback((read: SupportSuitabilityPerson[]) => {
    setLoaded(read);
    setPeople((current) => read.map((person) => current?.find((held) => held.partyId === person.partyId) ?? person));
  }, []);

  /** The marking is changed in Grundinformation as well, so the card follows every write wherever it was made. */
  useEffect(() => {
    if (!errandId) return;

    let abandoned = false;
    getSupportSuitabilityPeople(errandId, municipalityId)
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

  const change = (partyId: string, changes: Partial<SupportSuitabilityPerson>) =>
    setPeople((current) =>
      (current ?? []).map((person) => (person.partyId === partyId ? { ...person, ...changes } : person))
    );

  const asLoaded = (partyId: string) => loaded.find((person) => person.partyId === partyId);

  const isEdited = (person: SupportSuitabilityPerson): boolean => {
    const before = asLoaded(person.partyId);
    return !before || before.assessment !== person.assessment || before.comment !== person.comment;
  };

  const edited = (people ?? []).some(isEdited);

  useEffect(() => {
    onEdited(edited);
  }, [edited, onEdited]);

  /**
   * A comment cannot be written without a verdict, since the verdict is what the service stores it
   * beside. Saving the rest would leave the card edited for good, so the whole section waits.
   */
  const saveAll = useCallback(async (): Promise<boolean> => {
    const changed = (people ?? []).filter(isEdited);
    if (!errandId || changed.length === 0) return true;

    const found = Object.fromEntries(
      changed
        .filter((person) => !person.assessment)
        .map((person) => [person.partyId, 'common:personal_suitability.validation.assessment_required'])
    );
    setProblems(found);
    if (Object.keys(found).length > 0) {
      toastMessage(getToastOptions({ message: t('common:personal_suitability.toast.incomplete'), status: 'error' }));
      return false;
    }

    setBusy(true);
    try {
      for (const person of changed) {
        assessSupportSuitability(errandId, municipalityId, person.partyId, {
          assessment: person.assessment as SupportSuitabilityAssessmentName,
          comment: person.comment,
        });
      }
      setLoaded(people ?? []);
      return true;
    } catch {
      toastMessage(getToastOptions({ message: t('common:personal_suitability.toast.save_failed'), status: 'error' }));
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
      <div className="flex items-center gap-12 text-dark-secondary" data-cy="suitability-loading">
        <Spinner size={2} /> {t('common:personal_suitability.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16" data-cy="personal-suitability-section">
      <p className="text-dark-secondary m-0">{t('common:personal_suitability.description')}</p>

      {people.length === 0 ? (
        <Alert type="info" data-cy="suitability-empty">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{t('common:personal_suitability.empty')}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {people.map((person) => (
        <PersonCard
          key={person.partyId}
          person={person}
          writable={writable && !busy}
          problem={problems[person.partyId]}
          onAssessment={(assessment) => change(person.partyId, { assessment })}
          onComment={(comment) => change(person.partyId, { comment })}
        />
      ))}

      {writable ? (
        <div>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<UserPlus size={18} />}
            disabled={busy}
            data-cy="suitability-pbi-add-open"
            onClick={() => setAdding(true)}
          >
            {t('common:company.pbi.add.open')}
          </Button>
        </div>
      ) : null}

      <SupportPbiAddDialog show={adding} onClose={() => setAdding(false)} onAdd={addByHand} />
    </div>
  );
};
