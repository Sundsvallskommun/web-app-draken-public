import type { ErrandAttachment, Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { renderTemplatePdfDirect } from '@common/services/template-render-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Button, Disclosure, FormControl, FormLabel, Spinner, Textarea, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  ACCEPTED_UPLOAD_FILETYPES,
  getSupportAttachment,
  getSupportAttachments,
  saveSupportAttachments,
} from '@supportmanagement/services/support-attachment-service';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import {
  inspectionProtocolDetailsOf,
  inspectionProtocolFileName,
  toInspectionProtocolParameters,
} from '@supportmanagement/services/support-inspection-protocol-service';
import { SERVING_INSPECTION_PROTOCOL_TEMPLATE } from '@supportmanagement/services/support-inspection-protocol-template';
import {
  getSupportMeasures,
  SUPPORT_MEASURE_RESULTS,
  supportMeasureProtocolEdited,
  type SupportMeasureProtocolFields,
  supportMeasureProtocolFields,
  supportMeasureProtocolPatch,
  SupportMeasureResult,
  supportMeasuresOfType,
  SupportMeasureType,
  unlinkSupportMeasureAttachment,
  updateSupportMeasure,
  uploadSupportMeasureAttachment,
} from '@supportmanagement/services/support-measure-service';
import { pdfFileFromBase64 } from '@supportmanagement/services/support-statement-service';
import { FileDown, Paperclip, Trash2 } from 'lucide-react';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportErrandInspectionProtocolDetails } from './support-errand-inspection-protocol-details.component';
import { SupportErrandMeasures } from './support-errand-measures.component';

const TAB_KEY = 'inspection_protocol';
const ACCEPT = ACCEPTED_UPLOAD_FILETYPES.map((extension) => `.${extension}`).join(',');

interface Protocol {
  measures: Measure[];
  fields: Record<string, SupportMeasureProtocolFields>;
}

const RESULT_COLOR: Record<string, 'gronsta' | 'error' | 'primary'> = {
  COMPLETED: 'gronsta',
  NOT_COMPLETED: 'error',
  NOT_APPLICABLE: 'primary',
};

/** Loads the control points again, keeping what the handler has written on one that is still there. */
const withLatest = (current: Protocol, all: Measure[]): Protocol => {
  const latest = supportMeasuresOfType(all, SupportMeasureType.INTERNAL);
  const previousById = new Map(current.measures.map((measure) => [measure.id, measure]));
  const fields = Object.fromEntries(
    latest
      .filter((measure) => measure.id)
      .map((measure) => {
        const previous = previousById.get(measure.id);
        const written = current.fields[measure.id!];
        const keep = previous && written && supportMeasureProtocolEdited(written, previous);
        return [measure.id!, keep ? written : supportMeasureProtocolFields(measure)];
      })
  );
  return { measures: latest, fields };
};

const MeasureCard: FC<{
  index: number;
  measure: Measure;
  fields: SupportMeasureProtocolFields;
  readOnly: boolean;
  busy: boolean;
  onChange: (fields: SupportMeasureProtocolFields) => void;
  onUpload: (file: File) => void;
  onUnlink: (attachment: ErrandAttachment) => void;
  onOpen: (attachment: ErrandAttachment) => void;
}> = ({ index, measure, fields, readOnly, busy, onChange, onUpload, onUnlink, onOpen }) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const attachments = measure.attachments ?? [];

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy={`measure-${measure.id}`}>
      <div className="flex items-center gap-8">
        <span className="w-24 h-24 rounded-6 bg-vattjom-surface-primary text-white text-small font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className="font-bold">{measure.title}</span>
      </div>
      <div className="flex gap-8" role="group" aria-label={measure.title}>
        {SUPPORT_MEASURE_RESULTS.map(({ result, translationKey }) => {
          const selected = fields.result === result;
          return (
            <Button
              key={result}
              size="sm"
              variant={selected ? 'primary' : 'secondary'}
              rounded
              color={RESULT_COLOR[result]}
              aria-pressed={selected}
              disabled={readOnly}
              onClick={() => onChange({ ...fields, result: selected ? '' : result })}
              data-cy={`measure-result-${result}`}
            >
              {t(translationKey)}
            </Button>
          );
        })}
      </div>
      {/* relative keeps the sr-only label (absolute) from stretching the page below the content scroller */}
      <FormControl id={`measure-note-${measure.id}`} className="w-full relative">
        <FormLabel className="sr-only">{t('common:inspection_protocol.note')}</FormLabel>
        <Textarea
          className="w-full"
          rows={2}
          value={fields.description}
          placeholder={t('common:inspection_protocol.note_placeholder', { title: measure.title })}
          disabled={readOnly}
          onChange={(event) => onChange({ ...fields, description: event.target.value })}
          data-cy="measure-note"
        />
      </FormControl>
      {attachments.length > 0 ? (
        <ul className="m-0 p-0 list-none flex flex-col gap-4">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-8">
              <Button variant="link" onClick={() => onOpen(attachment)}>
                {attachment.fileName}
              </Button>
              <Button
                iconButton
                variant="tertiary"
                showBackground={false}
                size="sm"
                disabled={readOnly || busy}
                aria-label={t('common:inspection_protocol.remove_attachment', { fileName: attachment.fileName })}
                onClick={() => onUnlink(attachment)}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <Button
          variant="primary"
          inverted
          color="vattjom"
          size="sm"
          leftIcon={<Paperclip size={16} />}
          disabled={readOnly || busy}
          loading={busy}
          onClick={() => fileInput.current?.click()}
          data-cy="measure-upload"
        >
          {t('common:inspection_protocol.add_photo')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          data-cy="measure-file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onUpload(file);
            event.currentTarget.value = '';
          }}
        />
      </div>
    </section>
  );
};

/** The inspection protocol: one card per control point saved under Ärendeuppgifter, then the action points. */
export const SupportErrandInspectionProtocol: FC<{
  writable: boolean;
  setHasContent: (hasContent: boolean) => void;
}> = ({ writable, setHasContent }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const setUnsavedTab = useSupportStore((s) => s.setUnsavedTab);
  const setSupportAttachments = useSupportStore((s) => s.setSupportAttachments);
  const user = useUserStore((s) => s.user);
  const canEdit = user.permissions?.canEditSupportManagement;

  const errandId = supportErrand?.id;
  const modified = supportErrand?.modified;
  const readOnly = !canEdit || !writable || !supportErrand || isSupportErrandLocked(supportErrand);

  const [protocol, setProtocol] = useState<Protocol>({ measures: [], fields: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyMeasureId, setBusyMeasureId] = useState<string>();
  // The rest of the paper protocol; page state only until a json-schema exists to file it on the errand.
  const [details, setDetails] = useState(() => inspectionProtocolDetailsOf(supportErrand, user));
  const [generating, setGenerating] = useState(false);

  const receive = useCallback((latest: Measure[]) => setProtocol((current) => withLatest(current, latest)), []);

  useEffect(() => {
    if (!errandId || !municipalityId) return undefined;
    let current = true;
    getSupportMeasures(errandId, municipalityId)
      .then((latest) => {
        if (!current) return;
        receive(latest);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!current) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [errandId, municipalityId, modified, receive]);

  const edited = protocol.measures.some(
    (measure) => measure.id && supportMeasureProtocolEdited(protocol.fields[measure.id], measure)
  );
  const assessed = protocol.measures.filter((measure) => measure.id && protocol.fields[measure.id].result).length;
  const deficient = protocol.measures.filter(
    (measure) => measure.id && protocol.fields[measure.id].result === SupportMeasureResult.NOT_COMPLETED
  ).length;

  useEffect(() => {
    setUnsavedTab(TAB_KEY, edited);
    return () => setUnsavedTab(TAB_KEY, false);
  }, [edited, setUnsavedTab]);

  useEffect(() => {
    setHasContent(protocol.measures.length > 0);
  }, [protocol.measures.length, setHasContent]);

  const toast = (status: 'error' | 'success', key: string) =>
    toastMessage(getToastOptions({ status, message: t(key) }));

  const save = async (): Promise<boolean> => {
    if (!errandId || !municipalityId) return true;
    try {
      for (const measure of protocol.measures) {
        if (!measure.id || !supportMeasureProtocolEdited(protocol.fields[measure.id], measure)) continue;
        await updateSupportMeasure(
          errandId,
          municipalityId,
          measure.id,
          supportMeasureProtocolPatch(protocol.fields[measure.id])
        );
      }
      receive(await getSupportMeasures(errandId, municipalityId));
      return true;
    } catch (e) {
      console.error('Something went wrong when saving the inspection protocol', e);
      toast('error', 'common:inspection_protocol.save_error');
      return false;
    }
  };
  // The registered saver stays the same function; what it runs is the latest render's save.
  const saveLatest = useRef(save);
  useEffect(() => {
    saveLatest.current = save;
  });
  const saver = useCallback(() => saveLatest.current(), []);

  useEffect(() => {
    setTabSaver(TAB_KEY, saver);
    return () => setTabSaver(TAB_KEY, undefined);
  }, [saver, setTabSaver]);

  const setFields = (measureId: string, fields: SupportMeasureProtocolFields) =>
    setProtocol((current) => ({ ...current, fields: { ...current.fields, [measureId]: fields } }));

  const replaceMeasure = (replacement: Measure) =>
    setProtocol((current) => ({
      ...current,
      measures: current.measures.map((measure) => (measure.id === replacement.id ? replacement : measure)),
    }));

  const upload = async (measureId: string, file: File) => {
    if (!errandId || !municipalityId) return;
    setBusyMeasureId(measureId);
    try {
      replaceMeasure(await uploadSupportMeasureAttachment(errandId, municipalityId, measureId, file));
    } catch {
      toast('error', 'common:inspection_protocol.upload_failed');
    } finally {
      setBusyMeasureId(undefined);
    }
  };

  const unlink = async (measure: Measure, attachment: ErrandAttachment) => {
    if (!errandId || !municipalityId || !measure.id || !attachment.id) return;
    setBusyMeasureId(measure.id);
    try {
      await unlinkSupportMeasureAttachment(errandId, municipalityId, measure.id, attachment.id);
      replaceMeasure({ ...measure, attachments: measure.attachments?.filter((a) => a.id !== attachment.id) });
    } catch {
      toast('error', 'common:inspection_protocol.unlink_failed');
    } finally {
      setBusyMeasureId(undefined);
    }
  };

  /** Renders the protocol from the page's fields and the saved control points, and files it on the errand. */
  const generate = async () => {
    if (!errandId || !municipalityId) return;
    setGenerating(true);
    try {
      const parameters = toInspectionProtocolParameters(supportErrand.errandNumber, details, protocol.measures);
      const pdf = await renderTemplatePdfDirect(SERVING_INSPECTION_PROTOCOL_TEMPLATE, parameters);
      const file = pdfFileFromBase64(
        pdf,
        inspectionProtocolFileName(supportErrand.errandNumber, details.inspectionDate)
      );
      // saveSupportAttachments reads the file out of a FileList-shaped value.
      await saveSupportAttachments(errandId, municipalityId, [{ file: [file] as unknown as File }]);
      setSupportAttachments(await getSupportAttachments(errandId, municipalityId));
      toast('success', 'common:inspection_protocol.generated');
    } catch (e) {
      console.error('Something went wrong when generating the inspection protocol', e);
      toast('error', 'common:inspection_protocol.generate_failed');
    } finally {
      setGenerating(false);
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

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24" data-cy="inspection-protocol">
      <div>
        <h2 className="text-h2-md mb-8">{t('common:inspection_protocol.heading')}</h2>
        <p className="m-0">{t('common:inspection_protocol.intro')}</p>
      </div>

      {loading ? <Spinner size={3} aria-label={t('common:inspection_protocol.loading')} /> : null}
      {error ? <p className="m-0">{t('common:inspection_protocol.read_error')}</p> : null}
      {!loading && !error && protocol.measures.length === 0 ? (
        <p className="m-0">{t('common:inspection_protocol.empty')}</p>
      ) : null}

      {protocol.measures.length > 0 ? (
        <div className="flex flex-col gap-16">
          <SupportErrandInspectionProtocolDetails
            details={details}
            readOnly={readOnly}
            onChange={setDetails}
            part="before"
          />
          <span className="text-small font-bold self-end" data-cy="measures-assessed">
            {t('common:inspection_protocol.assessed', { assessed, total: protocol.measures.length })}
            {' - '}
            {t('common:inspection_protocol.deficient', { count: deficient })}
          </span>
          {protocol.measures.map((measure, index) =>
            measure.id ? (
              <MeasureCard
                key={measure.id}
                index={index}
                measure={measure}
                fields={protocol.fields[measure.id]}
                readOnly={readOnly}
                busy={busyMeasureId === measure.id}
                onChange={(fields) => setFields(measure.id!, fields)}
                onUpload={(file) => void upload(measure.id!, file)}
                onUnlink={(attachment) => void unlink(measure, attachment)}
                onOpen={(attachment) => void open(attachment)}
              />
            ) : null
          )}
          <SupportErrandInspectionProtocolDetails
            details={details}
            readOnly={readOnly}
            onChange={setDetails}
            part="after"
          />
          <div>
            <Button
              variant="primary"
              color="vattjom"
              leftIcon={<FileDown size={18} />}
              disabled={readOnly || generating || edited}
              loading={generating}
              loadingText={t('common:inspection_protocol.generating')}
              onClick={() => void generate()}
              data-cy="generate-inspection-protocol"
            >
              {t('common:inspection_protocol.generate')}
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && !error ? (
        <Disclosure variant="alt" className="w-full" data-cy="action-points">
          <Disclosure.Header>
            <Disclosure.Title>{t('common:inspection_protocol.action_points')}</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <SupportErrandMeasures measureType={SupportMeasureType.EXTERNAL} />
          </Disclosure.Content>
        </Disclosure>
      ) : null}
    </div>
  );
};
