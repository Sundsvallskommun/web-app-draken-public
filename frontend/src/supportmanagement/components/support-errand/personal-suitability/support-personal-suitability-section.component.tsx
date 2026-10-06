'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { Alert, FormControl, FormLabel, Select, Spinner, Textarea, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  assessSupportSuitability,
  getSupportSuitabilityPeople,
  SUPPORT_PARAMETER_VALUE_MAX_LENGTH,
  SUPPORT_SUITABILITY_ASSESSMENTS,
  type SupportSuitabilityAssessmentName,
  type SupportSuitabilityPerson,
} from '@supportmanagement/services/support-personal-suitability-service';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PersonCard: FC<{
  person: SupportSuitabilityPerson;
  writable: boolean;
  onAssessment: (assessment: SupportSuitabilityAssessmentName) => void;
  onComment: (comment: string) => void;
  onCommentWritten: () => void;
}> = ({ person, writable, onAssessment, onComment, onCommentWritten }) => {
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
          onBlur={onCommentWritten}
        />
      </FormControl>
    </div>
  );
};

export const SupportPersonalSuitabilitySection: FC<{ writable: boolean }> = ({ writable }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [people, setPeople] = useState<SupportSuitabilityPerson[]>();
  const [busy, setBusy] = useState(false);

  const errandId = supportErrand?.id;

  useEffect(() => {
    if (!errandId) return;

    let abandoned = false;
    getSupportSuitabilityPeople(errandId, municipalityId)
      .then((read) => {
        if (!abandoned) setPeople(read);
      })
      .catch(() => {
        if (!abandoned) setPeople([]);
      });

    return () => {
      abandoned = true;
    };
  }, [errandId, municipalityId]);

  const change = (partyId: string, changes: Partial<SupportSuitabilityPerson>) =>
    setPeople((current) =>
      (current ?? []).map((person) => (person.partyId === partyId ? { ...person, ...changes } : person))
    );

  const save = async (person: SupportSuitabilityPerson, changes: Partial<SupportSuitabilityPerson>) => {
    const written = { ...person, ...changes };
    if (!errandId || !written.assessment) return;

    setBusy(true);
    try {
      await assessSupportSuitability(errandId, municipalityId, person.partyId, {
        assessment: written.assessment,
        comment: written.comment,
      });
    } catch {
      toastMessage(getToastOptions({ message: t('common:personal_suitability.toast.save_failed'), status: 'error' }));
    } finally {
      setBusy(false);
    }
  };

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
          onAssessment={(assessment) => {
            change(person.partyId, { assessment });
            void save(person, { assessment });
          }}
          onComment={(comment) => change(person.partyId, { comment })}
          onCommentWritten={() => void save(person, {})}
        />
      ))}
    </div>
  );
};
