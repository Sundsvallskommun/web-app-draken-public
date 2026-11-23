import { ErrandSection } from '@common/components/errand-section/errand-section.component';
import type { ErrandAttachment } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Button, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { getSupportAttachment, getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import {
  SupportMeasureResult,
  type SupportMeasureRow,
  SupportMeasureType,
  unlinkSupportMeasureAttachment,
  uploadSupportMeasureAttachment,
} from '@supportmanagement/services/support-measure-service';
import { ClipboardCheck, Plus } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InspectionProtocolMeasureCard } from '../tabs/investigation/inspection-protocol-measure-card.component';
import { useMeasureDraft } from './use-measure-draft';

const emptyRow = (): SupportMeasureRow => ({ title: '', result: '', description: '', resultText: '' });

/**
 * The errand's control points as a section of their own: a card per point with its result, note and photos, and a
 * button to add one. Edits are written with Spara ärende; photos are written at once, as in the inspection protocol.
 */
export const SupportControlPointsSection: FC = () => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const setSupportAttachments = useSupportStore((s) => s.setSupportAttachments);
  const { errandId, municipalityId, readOnly, measures, rows, setRows, loading, error, replaceSaved } = useMeasureDraft(
    SupportMeasureType.INTERNAL,
    'controlPoints',
    'common:inspection_protocol.save_error'
  );
  const [busyRowId, setBusyRowId] = useState<string>();

  const assessed = rows.filter((row) => row.result).length;
  const deficient = rows.filter((row) => row.result === SupportMeasureResult.NOT_COMPLETED).length;
  const measureById = new Map((measures ?? []).map((measure) => [measure.id, measure]));

  const toast = (status: 'error' | 'success', key: string) =>
    toastMessage(getToastOptions({ status, message: t(key) }));

  // A photo is an attachment on the errand too, so the attachment list is read again after one changes.
  const readAttachments = () =>
    errandId &&
    getSupportAttachments(errandId, municipalityId)
      .then(setSupportAttachments)
      .catch(() => undefined);

  const upload = async (row: SupportMeasureRow, file: File) => {
    if (!errandId || !municipalityId || !row.id) return;
    setBusyRowId(row.id);
    try {
      replaceSaved(await uploadSupportMeasureAttachment(errandId, municipalityId, row.id, file));
      readAttachments();
    } catch {
      toast('error', 'common:inspection_protocol.upload_failed');
    } finally {
      setBusyRowId(undefined);
    }
  };

  const unlink = async (row: SupportMeasureRow, attachment: ErrandAttachment) => {
    const measure = measureById.get(row.id);
    if (!errandId || !municipalityId || !row.id || !measure || !attachment.id) return;
    setBusyRowId(row.id);
    try {
      await unlinkSupportMeasureAttachment(errandId, municipalityId, row.id, attachment.id);
      replaceSaved({ ...measure, attachments: measure.attachments?.filter((a) => a.id !== attachment.id) });
      readAttachments();
    } catch {
      toast('error', 'common:inspection_protocol.unlink_failed');
    } finally {
      setBusyRowId(undefined);
    }
  };

  const open = async (attachment: ErrandAttachment) => {
    if (!errandId || !municipalityId || !attachment.id) return;
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
      toast('error', 'common:inspection_protocol.open_failed');
    }
  };

  const summary = '';
  // rows.length > 0
  //   ? ` (${t('common:inspection_protocol.assessed', { assessed, total: rows.length })} - ${t(
  //       'common:inspection_protocol.deficient',
  //       { count: deficient }
  //     )})`
  //   : '';

  return (
    <ErrandSection
      icon={<ClipboardCheck />}
      title={`${t('common:inspection_protocol.control_points')}${summary}`}
      initialOpen
      data-cy="control-points-section"
    >
      {loading ? <Spinner size={3} aria-label={t('common:inspection_protocol.loading')} /> : null}
      {error ? <p className="m-0">{t('common:inspection_protocol.read_error')}</p> : null}
      {measures ? (
        <div className="flex flex-col gap-16">
          {rows.map((row, index) => (
            <InspectionProtocolMeasureCard
              key={row.id ?? `new-${index}`}
              index={index}
              row={row}
              attachments={measureById.get(row.id)?.attachments ?? []}
              readOnly={readOnly}
              busy={!!row.id && busyRowId === row.id}
              onChange={(changed) => setRows((current) => current.map((r, i) => (i === index ? changed : r)))}
              onRemove={() => setRows((current) => current.filter((_, i) => i !== index))}
              onUpload={(file) => void upload(row, file)}
              onUnlink={(attachment) => void unlink(row, attachment)}
              onOpen={(attachment) => void open(attachment)}
            />
          ))}
          <div>
            <Button
              variant="primary"
              inverted
              color="vattjom"
              size="sm"
              leftIcon={<Plus size={16} />}
              disabled={readOnly}
              onClick={() => setRows((current) => [...current, emptyRow()])}
              data-cy="control-point-section-add"
            >
              {t('common:inspection_protocol.add_control_point')}
            </Button>
          </div>
        </div>
      ) : null}
    </ErrandSection>
  );
};
