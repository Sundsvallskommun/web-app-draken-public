'use client';

import TextEditor from '@common/components/dynamic-text-editor';
import type { ErrandAttachment, Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import {
  Alert,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import { useMetadataStore, useSupportStore } from '@stores/index';
import { getSupportAttachment, getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import {
  attachmentsForPurpose,
  createSupportStatement,
  deleteSupportStatement,
  isSupportStatementRemovable,
  pdfFileFromBase64,
  renderSupportStatementPdf,
  selectableSupportStatementOutcomes,
  SUPPORT_STATEMENT_STATUSES,
  SUPPORT_STATEMENT_TYPE,
  supportStatementFields,
  type SupportStatementForm,
  SupportStatementPurpose,
  SupportStatementStatus,
  type SupportStatementStatusName,
  supportStatementUnderlayProblem,
  updateSupportStatement,
  uploadSupportStatementAttachment,
} from '@supportmanagement/services/support-statement-service';
import { Mail, Trash2, Upload } from 'lucide-react';
import { FC, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SUPPORT_STATEMENT_COUNTERPARTIES } from './support-statement-counterparties';

const AttachmentRow: FC<{ name: string; note: string; openLabel: string; onOpen: () => void }> = ({
  name,
  note,
  openLabel,
  onOpen,
}) => (
  <div className="flex items-center justify-between gap-16 border-1 rounded-groups px-16 py-8">
    <div className="flex items-center gap-12 min-w-0">
      <Mail size={18} className="shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold truncate">{name}</span>
        <span className="text-small text-dark-secondary">{note}</span>
      </div>
    </div>
    <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
      {openLabel}
    </Button>
  </div>
);

export const SupportStatementCard: FC<{
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
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const setSupportAttachments = useSupportStore((s) => s.setSupportAttachments);
  const fileInput = useRef<HTMLInputElement>(null);

  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState(false);

  const statementId = statement.id;
  const outcomes = selectableSupportStatementOutcomes(supportMetadata);
  const requests = attachmentsForPurpose(statement, SupportStatementPurpose.REQUEST);
  const responses = attachmentsForPurpose(statement, SupportStatementPurpose.RESPONSE);
  const counterpartyChosen = form.counterpartyName.length > 0;
  const removable = isSupportStatementRemovable(statement);
  const editable = writable && !busy;

  const titleOfStatement = t('common:statements.attachment_title', {
    counterparty: form.counterpartyName,
    errandNumber,
  });

  /** A file written here lands among the attachments of the errand, which the attachment tab reads. */
  const refreshAttachments = () =>
    getSupportAttachments(errandId, municipalityId)
      .then(setSupportAttachments)
      .catch(() => undefined);

  const set = (changes: Partial<SupportStatementForm>) => {
    setGenerated(false);
    onFormChange(changes);
  };

  /**
   * The service takes no statement without a counterparty, so the card lives on its own until one is
   * chosen and the statement is written at that moment rather than when the card was opened.
   */
  const chooseCounterparty = async (counterpartyName: string) => {
    set({ counterpartyName });
    if (!counterpartyName || statementId) return;

    setBusy(true);
    try {
      onChanged(
        await createSupportStatement(errandId, municipalityId, {
          type: SUPPORT_STATEMENT_TYPE,
          counterpartyName,
          title: t('common:statements.attachment_title', { counterparty: counterpartyName, errandNumber }),
        })
      );
    } catch {
      set({ counterpartyName: '' });
      toastMessage(getToastOptions({ message: t('common:statements.toast.add_failed'), status: 'error' }));
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!statementId || supportStatementUnderlayProblem(form)) return;

    setBusy(true);
    try {
      await updateSupportStatement(
        errandId,
        municipalityId,
        statementId,
        supportStatementFields(form, titleOfStatement)
      );
      const output = await renderSupportStatementPdf(form.question);
      const filename = t('common:statements.attachment_filename', {
        counterparty: form.counterpartyName,
        errandNumber,
      });
      onChanged(
        await uploadSupportStatementAttachment(
          errandId,
          municipalityId,
          statementId,
          pdfFileFromBase64(output, filename),
          SupportStatementPurpose.REQUEST
        )
      );
      await refreshAttachments();
      setGenerated(true);
    } catch {
      toastMessage(getToastOptions({ message: t('common:statements.toast.generate_failed'), status: 'error' }));
    } finally {
      setBusy(false);
    }
  };

  /** An answer that has arrived is what makes the statement answered, so the status follows the file. */
  const upload = async (file: File | undefined) => {
    if (!file || !statementId) return;

    setBusy(true);
    try {
      onChanged(
        await uploadSupportStatementAttachment(
          errandId,
          municipalityId,
          statementId,
          file,
          SupportStatementPurpose.RESPONSE
        )
      );
      onFormChange({ status: SupportStatementStatus.COMPLETED });
      await refreshAttachments();
    } catch {
      toastMessage(getToastOptions({ message: t('common:statements.toast.upload_failed'), status: 'error' }));
    } finally {
      setBusy(false);
    }
  };

  const open = async (attachment: ErrandAttachment) => {
    if (!attachment.id) return;

    try {
      const file = await getSupportAttachment(errandId, municipalityId, {
        id: attachment.id,
        fileName: attachment.fileName ?? '',
        mimeType: attachment.mimeType ?? '',
      });
      const link = document.createElement('a');
      link.href = `data:${attachment.mimeType};base64,${file.base64EncodedString}`;
      link.setAttribute('download', attachment.fileName ?? '');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toastMessage(getToastOptions({ message: t('common:statements.toast.open_failed'), status: 'error' }));
    }
  };

  const remove = async () => {
    if (!removable) return;

    if (!statementId) {
      onRemoved();
      return;
    }

    setBusy(true);
    try {
      await deleteSupportStatement(errandId, municipalityId, statementId);
      onRemoved();
    } catch {
      toastMessage(getToastOptions({ message: t('common:statements.toast.remove_failed'), status: 'error' }));
      setBusy(false);
    }
  };

  return (
    <div className="border-1 rounded-groups p-16 flex flex-col gap-16" data-cy={`statement-${statementId ?? 'new'}`}>
      <div className="flex items-end gap-16">
        <FormControl className="grow">
          <FormLabel>{t('common:statements.counterparty')}</FormLabel>
          <Select
            value={form.counterpartyName}
            disabled={!editable}
            data-cy="statement-counterparty"
            onChange={(e) => void chooseCounterparty(e.currentTarget.value)}
          >
            <Select.Option value="">{t('common:statements.counterparty_placeholder')}</Select.Option>
            {SUPPORT_STATEMENT_COUNTERPARTIES.map((counterparty) => (
              <Select.Option key={counterparty} value={counterparty}>
                {counterparty}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
        <Button
          type="button"
          iconButton
          variant="tertiary"
          color="error"
          disabled={!editable || !removable}
          aria-label={removable ? t('common:statements.remove') : t('common:statements.remove_blocked')}
          title={removable ? t('common:statements.remove') : t('common:statements.remove_blocked')}
          data-cy="statement-remove"
          onClick={() => void remove()}
        >
          <Trash2 size={20} />
        </Button>
      </div>

      {counterpartyChosen ? (
        <div className="flex flex-col gap-12">
          <FormControl className="w-full">
            <FormLabel>{t('common:statements.text')}</FormLabel>
            <TextEditor
              className="mb-0 text-editor-with-toolbar"
              value={{ markup: form.question }}
              readOnly={!editable}
              onChange={(e: { target: { value: { markup?: string } } }) =>
                set({ question: e.target.value.markup ?? '' })
              }
            />
          </FormControl>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={!editable}
              data-cy="statement-generate"
              leftIcon={busy ? <Spinner size={2} /> : <Mail size={18} />}
              onClick={() => void generate()}
            >
              {t('common:statements.generate')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-small text-dark-secondary italic m-0" data-cy="statement-choose-counterparty">
          {t('common:statements.choose_counterparty_first')}
        </p>
      )}

      {generated ? (
        <Alert type="success" data-cy="statement-generated">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{t('common:statements.generated')}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {[...requests, ...responses].map((attachment) => (
        <AttachmentRow
          key={attachment.id}
          name={attachment.fileName ?? ''}
          note={
            requests.includes(attachment)
              ? t('common:statements.attachment_request')
              : t('common:statements.attachment_response')
          }
          openLabel={t('common:statements.open')}
          onOpen={() => void open(attachment)}
        />
      ))}

      <div className="flex items-center gap-16">
        <Button
          type="button"
          variant="secondary"
          disabled={!editable || !statementId}
          data-cy="statement-upload"
          leftIcon={<Upload size={18} />}
          onClick={() => fileInput.current?.click()}
        >
          {t('common:statements.upload')}
        </Button>
        <span className="text-small text-dark-secondary">
          {statementId
            ? t('common:statements.tagged_as', { purpose: t('common:statements.attachment_response') })
            : t('common:statements.choose_counterparty_first_short')}
        </span>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          data-cy="statement-file"
          onChange={(e) => {
            void upload(e.currentTarget.files?.[0]);
            e.currentTarget.value = '';
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
        <FormControl>
          <FormLabel>{t('common:statements.sent_at')}</FormLabel>
          <Input
            type="date"
            value={form.sentAt}
            disabled={!editable}
            data-cy="statement-sent-at"
            onChange={(e) => set({ sentAt: e.currentTarget.value })}
          />
        </FormControl>
        <FormControl>
          <FormLabel>{t('common:statements.responded_at')}</FormLabel>
          <Input
            type="date"
            value={form.respondedAt}
            disabled={!editable}
            data-cy="statement-responded-at"
            onChange={(e) => set({ respondedAt: e.currentTarget.value })}
          />
        </FormControl>
        <FormControl>
          <FormLabel>{t('common:statements.status_label')}</FormLabel>
          <Select
            value={form.status}
            disabled={!editable}
            data-cy="statement-status"
            onChange={(e) => set({ status: e.currentTarget.value as SupportStatementStatusName })}
          >
            {SUPPORT_STATEMENT_STATUSES.map((candidate) => (
              <Select.Option key={candidate.status} value={candidate.status}>
                {t(candidate.translationKey)}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>{t('common:statements.outcome')}</FormLabel>
          <Select
            value={form.outcome}
            disabled={!editable}
            data-cy="statement-outcome"
            onChange={(e) => set({ outcome: e.currentTarget.value })}
          >
            <Select.Option value="">{t('common:statements.outcome_placeholder')}</Select.Option>
            {outcomes.map((outcome) => (
              <Select.Option key={outcome.name} value={outcome.name ?? ''}>
                {outcome.displayName ?? outcome.name}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      </div>

      <FormControl className="w-full">
        <FormLabel>{t('common:statements.response_text')}</FormLabel>
        <Textarea
          className="w-full"
          rows={4}
          value={form.responseText}
          disabled={!editable}
          placeholder={t('common:statements.response_text_placeholder')}
          data-cy="statement-response-text"
          onChange={(e) => set({ responseText: e.currentTarget.value })}
        />
      </FormControl>

      {problem ? (
        <Alert type="error" data-cy="statement-error">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{t(problem)}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
};
