import type { ErrandAttachment, Investigation, Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import type { User } from '@common/interfaces/user';
import { getToastOptions } from '@common/utils/toast-message-settings';
import {
  Button,
  Disclosure,
  FormControl,
  FormLabel,
  Select,
  Spinner,
  Textarea,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  INSPECTION_PROTOCOL_TEMPLATES,
  type InspectionProtocolTemplate,
  inspectionProtocolTemplate,
} from '@supportmanagement/inspection-protocols';
import {
  ACCEPTED_UPLOAD_FILETYPES,
  getSupportAttachment,
  getSupportAttachments,
  saveSupportAttachments,
} from '@supportmanagement/services/support-attachment-service';
import { isSupportErrandLocked, type SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  inspectionProtocolFileName,
  type InspectionProtocolValues,
  inspectionProtocolValuesFromParameters,
  inspectionProtocolValuesOf,
  renderInspectionProtocol,
  toInspectionProtocolInvestigationParameters,
  toInspectionProtocolRenderParameters,
} from '@supportmanagement/services/support-inspection-protocol-service';
import {
  getSupportInvestigation,
  isSupportInvestigationConflict,
  saveSupportInvestigation,
  startSupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import {
  getSupportMeasures,
  saveSupportMeasures,
  SUPPORT_MEASURE_RESULTS,
  supportMeasureChanges,
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
import dayjs from 'dayjs';
import { FileDown, Paperclip, Trash2 } from 'lucide-react';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportErrandInspectionProtocolFields } from './support-errand-inspection-protocol-fields.component';
import { SupportErrandMeasures } from './support-errand-measures.component';

const TAB_KEY = 'inspection_protocol';
const ACCEPT = ACCEPTED_UPLOAD_FILETYPES.map((extension) => `.${extension}`).join(',');

/** What the errand holds: the control points (INTERNAL measures) and the investigation with the template's answers. */
interface Loaded {
  investigation?: Investigation;
  measures: Measure[];
}

/** A control point on the page; `saved` is missing until the row has been written. */
interface ProtocolRow {
  key: string;
  saved?: Measure;
  title: string;
  fields: SupportMeasureProtocolFields;
}

/** The page's state: the chosen template (none until the handler picks one), its control points and answers. */
interface Draft {
  template?: InspectionProtocolTemplate;
  rows: ProtocolRow[];
  values: InspectionProtocolValues;
}

type Errand = Pick<SupportErrand, 'customer'> | undefined;
type Handler = Pick<User, 'name'> | undefined;

const RESULT_COLOR: Record<string, 'gronsta' | 'error' | 'primary'> = {
  COMPLETED: 'gronsta',
  NOT_COMPLETED: 'error',
  NOT_APPLICABLE: 'primary',
};

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const templateRows = (template: InspectionProtocolTemplate): ProtocolRow[] =>
  template.controlPoints.map((title, index) => ({
    key: `new-${index}`,
    title,
    fields: { result: '', description: '' },
  }));

const savedRow = (measure: Measure): ProtocolRow => ({
  key: measure.id ?? measure.title ?? '',
  saved: measure,
  title: measure.title ?? '',
  fields: supportMeasureProtocolFields(measure),
});

/** The page as the errand has it: the template is the investigation's, or none until the handler picks one. */
const draftOf = (loaded: Loaded, errand: Errand, user: Handler): Draft => {
  const template = inspectionProtocolTemplate(loaded.investigation?.type);
  return {
    template,
    rows: loaded.measures.map(savedRow),
    values: template
      ? inspectionProtocolValuesFromParameters(
          template,
          loaded.investigation?.parameters,
          inspectionProtocolValuesOf(template, errand, user)
        )
      : {},
  };
};

const rowCore = (row: ProtocolRow) => ({ id: row.saved?.id, title: row.title, fields: row.fields });

const isEdited = (draft: Draft, baseline: Draft): boolean =>
  draft.template?.key !== baseline.template?.key ||
  !same(draft.rows.map(rowCore), baseline.rows.map(rowCore)) ||
  !same(draft.values, baseline.values);

/** Takes the reloaded page, keeping what the handler has changed but not saved. */
const withLatest = (draft: Draft, previous: Draft, latest: Draft): Draft => {
  if (!isEdited(draft, previous)) return latest;
  if (draft.template?.key !== latest.template?.key) return draft;
  const written = new Map(draft.rows.filter((row) => row.saved?.id).map((row) => [row.saved!.id!, row]));
  const before = new Map(previous.rows.filter((row) => row.saved?.id).map((row) => [row.saved!.id!, row]));
  const saved = latest.rows
    .filter((row) => row.saved?.id)
    .map((row) => {
      const edited = written.get(row.saved!.id!);
      const loaded = before.get(row.saved!.id!);
      return edited && loaded && !same(edited.fields, loaded.fields) ? { ...row, fields: edited.fields } : row;
    });
  const rows = [...saved, ...draft.rows.filter((row) => !row.saved)];
  return {
    template: draft.template,
    rows: rows.length > 0 ? rows : latest.rows,
    values: same(draft.values, previous.values) ? latest.values : draft.values,
  };
};

const load = (errandId: string, municipalityId: string): Promise<Loaded> =>
  Promise.all([getSupportMeasures(errandId, municipalityId), getSupportInvestigation(errandId, municipalityId)]).then(
    ([measures, investigation]) => ({
      measures: supportMeasuresOfType(measures, SupportMeasureType.INTERNAL),
      investigation,
    })
  );

const MeasureCard: FC<{
  index: number;
  row: ProtocolRow;
  readOnly: boolean;
  busy: boolean;
  onChange: (fields: SupportMeasureProtocolFields) => void;
  onUpload: (file: File) => void;
  onUnlink: (attachment: ErrandAttachment) => void;
  onOpen: (attachment: ErrandAttachment) => void;
}> = ({ index, row, readOnly, busy, onChange, onUpload, onUnlink, onOpen }) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const attachments = row.saved?.attachments ?? [];
  const { fields } = row;

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy={`measure-${row.key}`}>
      <div className="flex items-center gap-8">
        <span className="w-24 h-24 rounded-6 bg-vattjom-surface-primary text-white text-small font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className="font-bold">{row.title}</span>
      </div>
      <div className="flex gap-8" role="group" aria-label={row.title}>
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
      <FormControl id={`measure-note-${row.key}`} className="w-full relative">
        <FormLabel className="sr-only">{t('common:inspection_protocol.note')}</FormLabel>
        <Textarea
          className="w-full"
          rows={2}
          value={fields.description}
          placeholder={t('common:inspection_protocol.note_placeholder', { title: row.title })}
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
      {/* A photo is linked to the saved measure, so the row has to be saved first. */}
      {row.saved ? (
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
      ) : null}
    </section>
  );
};

/** The inspection protocol: a template, its fields, a card per control point, then the action points. */
export const SupportErrandInspectionProtocol: FC<{
  writable: boolean;
  setHasContent: (hasContent: boolean) => void;
}> = ({ writable, setHasContent }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
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

  const [loaded, setLoaded] = useState<{ data: Loaded; baseline: Draft }>();
  const [draft, setDraft] = useState<Draft>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyRowKey, setBusyRowKey] = useState<string>();
  const [generating, setGenerating] = useState(false);

  // The prefills read the errand and the user as they are when the page loads, not on every store update.
  const context = useRef<{ errand: Errand; user: Handler }>({ errand: supportErrand, user });
  context.current = { errand: supportErrand, user };

  const previousBaseline = useRef<Draft | undefined>(undefined);

  /** A reload keeps the handler's unsaved work; after a save the page is what was written. */
  const receive = useCallback((latest: Loaded, afterSave = false) => {
    const baseline = draftOf(latest, context.current.errand, context.current.user);
    const previous = previousBaseline.current;
    previousBaseline.current = baseline;
    setLoaded({ data: latest, baseline });
    setDraft((draft) => (draft && previous && !afterSave ? withLatest(draft, previous, baseline) : baseline));
  }, []);

  useEffect(() => {
    if (!errandId || !municipalityId) return undefined;
    let current = true;
    load(errandId, municipalityId)
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

  const rows = draft?.rows ?? [];
  const edited = !!draft && !!loaded && isEdited(draft, loaded.baseline);
  const assessed = rows.filter((row) => row.fields.result).length;
  const deficient = rows.filter((row) => row.fields.result === SupportMeasureResult.NOT_COMPLETED).length;

  useEffect(() => {
    setUnsavedTab(TAB_KEY, edited);
    return () => setUnsavedTab(TAB_KEY, false);
  }, [edited, setUnsavedTab]);

  useEffect(() => {
    setHasContent(rows.length > 0);
  }, [rows.length, setHasContent]);

  const toast = (status: 'error' | 'success', key: string) =>
    toastMessage(getToastOptions({ status, message: t(key) }));

  /** Writes the control points as measures and the template with its answers on the investigation. */
  const save = async (): Promise<boolean> => {
    if (!errandId || !municipalityId || !draft || !loaded) return true;
    try {
      const changes = supportMeasureChanges(
        draft.rows.map((row) => ({ id: row.saved?.id, title: row.title, ...row.fields })),
        loaded.data.measures
      );
      await saveSupportMeasures(errandId, municipalityId, SupportMeasureType.INTERNAL, changes);
      for (const row of draft.rows) {
        if (!row.saved?.id || !supportMeasureProtocolEdited(row.fields, row.saved)) continue;
        await updateSupportMeasure(errandId, municipalityId, row.saved.id, supportMeasureProtocolPatch(row.fields));
      }
      const { investigation } = loaded.data;
      const parameters = draft.template
        ? toInspectionProtocolInvestigationParameters(draft.template, draft.values)
        : [];
      if (!draft.template) {
        // Nothing chosen yet: only the control points are written.
      } else if (!investigation?.id) {
        await startSupportInvestigation(errandId, municipalityId, draft.template.label, [], {
          type: draft.template.key,
          parameters,
        });
      } else if (draft.template.key !== loaded.baseline.template?.key || !same(draft.values, loaded.baseline.values)) {
        await saveSupportInvestigation(errandId, municipalityId, investigation.id, {
          version: investigation.version ?? 0,
          type: draft.template.key,
          title: draft.template.label,
          parameters,
        });
      }
      receive(await load(errandId, municipalityId), true);
      return true;
    } catch (e) {
      console.error('Something went wrong when saving the inspection protocol', e);
      toast(
        'error',
        isSupportInvestigationConflict(e) ? 'common:investigation.conflict' : 'common:inspection_protocol.save_error'
      );
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

  const updateDraft = (change: (current: Draft) => Draft) =>
    setDraft((current) => (current ? change(current) : current));

  const setFields = (key: string, fields: SupportMeasureProtocolFields) =>
    updateDraft((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.key === key ? { ...row, fields } : row)),
    }));

  const setValues = (values: InspectionProtocolValues) => updateDraft((current) => ({ ...current, values }));

  const replaceSaved = (replacement: Measure) =>
    updateDraft((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.saved?.id === replacement.id ? { ...row, saved: replacement } : row)),
    }));

  /** A new template starts over: its control points, its fields. What was saved goes when the errand is saved. */
  const changeTemplate = async (key: string) => {
    const template = inspectionProtocolTemplate(key);
    if (!template || !draft || !loaded || template.key === draft.template?.key) return;
    const hasData = loaded.data.measures.length > 0 || !!loaded.data.investigation || edited;
    if (hasData) {
      const confirmed = await confirm.showConfirmation(
        t('common:inspection_protocol.template_change_title'),
        t('common:inspection_protocol.template_change_text'),
        t('common:inspection_protocol.template_change_yes'),
        t('common:inspection_protocol.template_change_no'),
        'info',
        'info'
      );
      if (!confirmed) return;
    }
    setDraft({
      template,
      rows: templateRows(template),
      values: inspectionProtocolValuesOf(template, context.current.errand, context.current.user),
    });
  };

  const upload = async (row: ProtocolRow, file: File) => {
    if (!errandId || !municipalityId || !row.saved?.id) return;
    setBusyRowKey(row.key);
    try {
      replaceSaved(await uploadSupportMeasureAttachment(errandId, municipalityId, row.saved.id, file));
    } catch {
      toast('error', 'common:inspection_protocol.upload_failed');
    } finally {
      setBusyRowKey(undefined);
    }
  };

  const unlink = async (row: ProtocolRow, attachment: ErrandAttachment) => {
    if (!errandId || !municipalityId || !row.saved?.id || !attachment.id) return;
    setBusyRowKey(row.key);
    try {
      await unlinkSupportMeasureAttachment(errandId, municipalityId, row.saved.id, attachment.id);
      replaceSaved({ ...row.saved, attachments: row.saved.attachments?.filter((a) => a.id !== attachment.id) });
    } catch {
      toast('error', 'common:inspection_protocol.unlink_failed');
    } finally {
      setBusyRowKey(undefined);
    }
  };

  /** Renders the protocol from the saved answers and control points, and files it on the errand. */
  const generate = async () => {
    if (!errandId || !municipalityId || !draft?.template || !loaded) return;
    setGenerating(true);
    try {
      const parameters = toInspectionProtocolRenderParameters(
        draft.template,
        supportErrand.errandNumber,
        draft.values,
        loaded.data.measures
      );
      const pdf = await renderInspectionProtocol(draft.template, parameters);
      const file = pdfFileFromBase64(
        pdf,
        inspectionProtocolFileName(supportErrand.errandNumber, dayjs().format('YYYY-MM-DD'))
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

      {draft ? (
        <div className="flex flex-col gap-16">
          <FormControl id="protocol-template" className="w-full max-w-[32rem]">
            <FormLabel>{t('common:inspection_protocol.template')}</FormLabel>
            <Select
              value={draft.template?.key ?? ''}
              onChange={(event) => void changeTemplate(event.target.value)}
              disabled={readOnly}
              data-cy="protocol-template"
            >
              <Select.Option value="">{t('common:inspection_protocol.template_placeholder')}</Select.Option>
              {INSPECTION_PROTOCOL_TEMPLATES.map((template) => (
                <Select.Option key={template.key} value={template.key}>
                  {template.label}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
          {draft.template ? (
            <SupportErrandInspectionProtocolFields
              template={draft.template}
              values={draft.values}
              readOnly={readOnly}
              onChange={setValues}
              position="before"
            />
          ) : null}
          {draft.template && rows.length === 0 ? <p className="m-0">{t('common:inspection_protocol.empty')}</p> : null}
          {rows.length > 0 ? (
            <span className="text-small font-bold self-end" data-cy="measures-assessed">
              {t('common:inspection_protocol.assessed', { assessed, total: rows.length })}
              {' - '}
              {t('common:inspection_protocol.deficient', { count: deficient })}
            </span>
          ) : null}
          {rows.map((row, index) => (
            <MeasureCard
              key={row.key}
              index={index}
              row={row}
              readOnly={readOnly}
              busy={busyRowKey === row.key}
              onChange={(fields) => setFields(row.key, fields)}
              onUpload={(file) => void upload(row, file)}
              onUnlink={(attachment) => void unlink(row, attachment)}
              onOpen={(attachment) => void open(attachment)}
            />
          ))}
          {draft.template ? (
            <>
              <SupportErrandInspectionProtocolFields
                template={draft.template}
                values={draft.values}
                readOnly={readOnly}
                onChange={setValues}
                position="after"
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
            </>
          ) : null}
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
