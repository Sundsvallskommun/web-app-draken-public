'use client';

import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Button, FormControl, FormLabel, Input, Label, Select, Textarea, useSnackbar } from '@sk-web-gui/react';
import { useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  sendSupportCommunication,
  SupportCommunicationChannel,
  supportCommunicationChannel,
} from '@supportmanagement/services/support-communication-service';
import {
  deleteSupportStatement,
  selectableSupportStatementOutcomes,
  SUPPORT_STATEMENT_STATUSES,
  supportCommunicationFields,
  supportCommunicationIsSettled,
  type SupportStatementForm,
  SupportStatementStatus,
  updateSupportStatement,
} from '@supportmanagement/services/support-statement-service';
import dayjs from 'dayjs';
import { Send, Trash2 } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

const statusKeyOf = (status: string): string =>
  SUPPORT_STATEMENT_STATUSES.find((candidate) => candidate.status === status)?.translationKey ?? '';

/**
 * One communication with the permit holder: what the handler tells them before a decision goes against them, a
 * deadline to answer by, and the outcome once it is settled. Sending it leaves the unit as a message, so the
 * permit holder reads it where they read everything else, and the statement stands among the errand's statements.
 */
export const SupportCommunicationCard: FC<{
  statement: Statement;
  form: SupportStatementForm;
  problem: string | undefined;
  errandId: string;
  errandNumber: string;
  municipalityId: string;
  writable: boolean;
  onFormChange: (changes: Partial<SupportStatementForm>) => void;
  onChanged: (statement: Statement) => void;
  onRemoved: () => void;
}> = ({
  statement,
  form,
  problem,
  errandId,
  errandNumber,
  municipalityId,
  writable,
  onFormChange,
  onChanged,
  onRemoved,
}) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const user = useUserStore((s) => s.user);
  const [busy, setBusy] = useState(false);

  const unsent = form.status === SupportStatementStatus.DRAFT;
  const settled = supportCommunicationIsSettled(statement);
  const editable = writable && !settled;
  const recipient = statement.counterpartyName ?? '';
  const channel = supportErrand ? supportCommunicationChannel(supportErrand) : SupportCommunicationChannel.EMAIL;
  const removeLabel = t('common:communications.remove');

  const tell = (key: string, status: 'success' | 'error') => toastMessage(getToastOptions({ message: t(key), status }));

  /** Sending is one step: the message leaves the unit and the statement becomes the one awaiting an answer. */
  const send = async () => {
    if (!supportErrand || !statement.id) return;
    if (!form.freeText.trim()) {
      tell('common:communications.validation.text', 'error');
      return;
    }

    setBusy(true);
    try {
      await sendSupportCommunication(municipalityId, supportErrand, form.freeText, user.name);
      const sentAt = dayjs().format('YYYY-MM-DD');
      onChanged(
        await updateSupportStatement(
          errandId,
          municipalityId,
          statement.id,
          supportCommunicationFields(
            { ...form, status: SupportStatementStatus.ACTIVE, sentAt },
            recipient,
            t('common:communications.title', { errandNumber })
          )
        )
      );
      tell('common:communications.toast.sent', 'success');
    } catch {
      tell('common:communications.toast.send_failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!statement.id) {
      onRemoved();
      return;
    }

    setBusy(true);
    try {
      await deleteSupportStatement(errandId, municipalityId, statement.id);
      onRemoved();
    } catch {
      tell('common:communications.toast.remove_failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="border-1 rounded-groups p-16 flex flex-col gap-16"
      data-cy={`communication-${statement.id ?? 'new'}`}
    >
      <div className="flex items-center gap-16">
        <span className="font-bold grow">{t('common:communications.heading')}</span>
        <Label rounded color={settled ? 'gronsta' : 'tertiary'} inverted>
          {t(statusKeyOf(form.status))}
        </Label>
        <Button
          type="button"
          iconButton
          variant="tertiary"
          color="error"
          disabled={!writable || busy || !unsent}
          aria-label={removeLabel}
          title={removeLabel}
          data-cy="communication-remove"
          onClick={() => void remove()}
        >
          <Trash2 size={20} />
        </Button>
      </div>

      <p className="text-small text-dark-secondary m-0">
        {t(`common:communications.channel.${channel}`, { recipient })}
      </p>

      <FormControl className="w-full">
        <FormLabel>{t('common:communications.text')}</FormLabel>
        <Textarea
          className="w-full"
          rows={6}
          value={form.freeText}
          disabled={!editable || !unsent}
          placeholder={t('common:communications.text_placeholder')}
          data-cy="communication-text"
          onChange={(event) => onFormChange({ freeText: event.currentTarget.value })}
        />
      </FormControl>

      <div className="flex flex-wrap items-end gap-16">
        <FormControl>
          <FormLabel>{t('common:communications.due_at')}</FormLabel>
          <Input
            type="date"
            value={form.dueAt}
            disabled={!editable}
            data-cy="communication-due-at"
            onChange={(event) => onFormChange({ dueAt: event.currentTarget.value })}
          />
        </FormControl>

        {unsent ? (
          <Button
            type="button"
            variant="primary"
            disabled={!editable || busy}
            loading={busy}
            rightIcon={<Send size={18} />}
            data-cy="communication-send"
            onClick={() => void send()}
          >
            {t('common:communications.send')}
          </Button>
        ) : null}
      </div>

      {unsent ? null : (
        <div className="flex flex-wrap items-end gap-16">
          <FormControl className="grow">
            <FormLabel>{t('common:communications.outcome')}</FormLabel>
            <Select
              value={form.outcome}
              disabled={!editable}
              data-cy="communication-outcome"
              onChange={(event) =>
                onFormChange({
                  outcome: event.currentTarget.value,
                  status: event.currentTarget.value ? SupportStatementStatus.COMPLETED : SupportStatementStatus.ACTIVE,
                })
              }
            >
              <Select.Option value="">{t('common:communications.outcome_placeholder')}</Select.Option>
              {selectableSupportStatementOutcomes(supportMetadata).map((outcome) => (
                <Select.Option key={outcome.name} value={outcome.name}>
                  {outcome.displayName || outcome.name}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel>{t('common:communications.responded_at')}</FormLabel>
            <Input
              type="date"
              value={form.respondedAt}
              disabled={!editable}
              data-cy="communication-responded-at"
              onChange={(event) => onFormChange({ respondedAt: event.currentTarget.value })}
            />
          </FormControl>
        </div>
      )}

      {problem ? (
        <p className="text-error text-small m-0" data-cy="communication-problem">
          {t(problem)}
        </p>
      ) : null}
    </div>
  );
};
