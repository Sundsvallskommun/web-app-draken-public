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
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { INSPECTION_PROTOCOL_TEMPLATES, inspectionProtocolTemplate } from '@supportmanagement/inspection-protocols';
import {
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
  supportMeasureChanges,
  SupportMeasureResult,
  type SupportMeasureRow,
  supportMeasureRow,
  supportMeasuresOfType,
  SupportMeasureType,
  unlinkSupportMeasureAttachment,
  uploadSupportMeasureAttachment,
} from '@supportmanagement/services/support-measure-service';
import { pdfFileFromBase64 } from '@supportmanagement/services/support-statement-service';
import dayjs from 'dayjs';
import { FileDown, Plus } from 'lucide-react';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InspectionProtocolActionPoints } from './inspection-protocol-action-points.component';
import { InspectionProtocolFields } from './inspection-protocol-fields.component';
import { InspectionProtocolMeasureCard } from './inspection-protocol-measure-card.component';

// The protocol is what the Utredning tab holds for an inspection errand, so it saves under that tab's key.
const TAB_KEY = 'investigation';

/** What the errand holds: the measures (control points and action points) and the investigation with the answers. */
interface Saved {
  measures: Measure[];
  investigation?: Investigation;
}

/** The page: the chosen template (none until the handler picks one), its answers, and the two measure lists. */
interface Draft {
  templateKey?: string;
  values: InspectionProtocolValues;
  controlPoints: SupportMeasureRow[];
  actionPoints: SupportMeasureRow[];
}

type Errand = Pick<SupportErrand, 'customer'> | undefined;
type Handler = Pick<User, 'name'> | undefined;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const rowsOf = (saved: Saved, type: keyof typeof SupportMeasureType): SupportMeasureRow[] =>
  supportMeasuresOfType(saved.measures, SupportMeasureType[type]).map(supportMeasureRow);

/** The page as the errand has it. The prefills fill in what no saved answer covers. */
const draftOf = (saved: Saved, errand: Errand, user: Handler): Draft => {
  const template = inspectionProtocolTemplate(saved.investigation?.type);
  return {
    templateKey: template?.key,
    values: template
      ? inspectionProtocolValuesFromParameters(
          template,
          saved.investigation?.parameters,
          inspectionProtocolValuesOf(template, errand, user)
        )
      : {},
    controlPoints: rowsOf(saved, 'INTERNAL'),
    actionPoints: rowsOf(saved, 'EXTERNAL'),
  };
};

const load = (errandId: string, municipalityId: string): Promise<Saved> =>
  Promise.all([getSupportMeasures(errandId, municipalityId), getSupportInvestigation(errandId, municipalityId)]).then(
    ([measures, investigation]) => ({ measures, investigation })
  );

/** The inspection protocol: a template, its fields, a card per control point, then the action points. */
export const InspectionProtocol: FC<{
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
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);

  const errandId = supportErrand?.id;
  const readOnly = !canEdit || !writable || !supportErrand || isSupportErrandLocked(supportErrand);

  const [saved, setSaved] = useState<{ data: Saved; baseline: Draft }>();
  const [draft, setDraft] = useState<Draft>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string>();
  const [generating, setGenerating] = useState(false);

  /** Takes what the errand holds as both the saved state and the page. */
  const receive = (data: Saved) => {
    const baseline = draftOf(data, useSupportStore.getState().supportErrand, useUserStore.getState().user);
    setSaved({ data, baseline });
    setDraft(baseline);
  };

  // Read once per errand and after each save. The errand is read again by Spara before the tab savers run,
  // so a reload here would only risk overwriting what the handler has written.
  useEffect(() => {
    if (!errandId || !municipalityId) return undefined;
    let current = true;
    load(errandId, municipalityId)
      .then((data) => {
        if (!current) return;
        receive(data);
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
  }, [errandId, municipalityId]);

  const template = inspectionProtocolTemplate(draft?.templateKey);
  const rows = draft?.controlPoints ?? [];
  const edited = !!draft && !!saved && !same(draft, saved.baseline);
  const assessed = rows.filter((row) => row.result).length;
  const deficient = rows.filter((row) => row.result === SupportMeasureResult.NOT_COMPLETED).length;
  const measureById = new Map((saved?.data.measures ?? []).map((measure) => [measure.id, measure]));

  useEffect(() => {
    setUnsavedTab(TAB_KEY, edited);
    return () => setUnsavedTab(TAB_KEY, false);
  }, [edited, setUnsavedTab]);

  useEffect(() => {
    setHasContent(rows.length > 0);
  }, [rows.length, setHasContent]);

  const toast = (status: 'error' | 'success', key: string) =>
    toastMessage(getToastOptions({ status, message: t(key) }));

  /** Writes both measure lists, then the template with its answers on the investigation. */
  const save = async (): Promise<boolean> => {
    if (!errandId || !municipalityId || !draft || !saved) return true;
    const { baseline, data } = saved;
    try {
      await saveSupportMeasures(
        errandId,
        municipalityId,
        SupportMeasureType.INTERNAL,
        supportMeasureChanges(draft.controlPoints, baseline.controlPoints)
      );
      await saveSupportMeasures(
        errandId,
        municipalityId,
        SupportMeasureType.EXTERNAL,
        supportMeasureChanges(draft.actionPoints, baseline.actionPoints)
      );
      if (template) {
        const parameters = toInspectionProtocolInvestigationParameters(template, draft.values);
        if (!data.investigation?.id) {
          await startSupportInvestigation(errandId, municipalityId, template.label, [], {
            type: template.key,
            parameters,
          });
        } else if (template.key !== baseline.templateKey || !same(draft.values, baseline.values)) {
          await saveSupportInvestigation(errandId, municipalityId, data.investigation.id, {
            version: data.investigation.version ?? 0,
            type: template.key,
            title: template.label,
            parameters,
          });
        }
      }
      receive(await load(errandId, municipalityId));
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

  const setControlPoint = (index: number, row: SupportMeasureRow) =>
    updateDraft((current) => ({
      ...current,
      controlPoints: current.controlPoints.map((candidate, i) => (i === index ? row : candidate)),
    }));

  /** A point the handler adds beyond the template's; a removed one is deleted when the errand is saved. */
  const addControlPoint = () =>
    updateDraft((current) => ({
      ...current,
      controlPoints: [...current.controlPoints, { title: '', result: '', description: '' }],
    }));

  const removeControlPoint = (index: number) =>
    updateDraft((current) => ({
      ...current,
      controlPoints: current.controlPoints.filter((_, i) => i !== index),
    }));

  /** A photo changes the saved measure only; the rows are left as they are. */
  const replaceSaved = (replacement: Measure) =>
    setSaved(
      (current) =>
        current && {
          ...current,
          data: {
            ...current.data,
            measures: current.data.measures.map((measure) => (measure.id === replacement.id ? replacement : measure)),
          },
        }
    );

  /** A new template starts over: its control points, its fields. What was saved goes when the errand is saved. */
  const changeTemplate = async (key: string) => {
    const next = inspectionProtocolTemplate(key);
    if (!next || !draft || !saved || next.key === draft.templateKey) return;
    const hasData = saved.baseline.controlPoints.length > 0 || !!saved.data.investigation || edited;
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
    updateDraft((current) => ({
      ...current,
      templateKey: next.key,
      values: inspectionProtocolValuesOf(next, useSupportStore.getState().supportErrand, useUserStore.getState().user),
      controlPoints: next.controlPoints.map((title) => ({ title, result: '', description: '' })),
    }));
  };

  const upload = async (row: SupportMeasureRow, file: File) => {
    if (!errandId || !municipalityId || !row.id) return;
    setBusyRowId(row.id);
    try {
      replaceSaved(await uploadSupportMeasureAttachment(errandId, municipalityId, row.id, file));
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
    } catch {
      toast('error', 'common:inspection_protocol.unlink_failed');
    } finally {
      setBusyRowId(undefined);
    }
  };

  /** Renders the protocol from the saved answers and control points, and files it on the errand. */
  const generate = async () => {
    if (!errandId || !municipalityId || !template || !draft || !saved) return;
    setGenerating(true);
    try {
      const parameters = toInspectionProtocolRenderParameters(
        template,
        supportErrand.errandNumber,
        draft.values,
        saved.baseline.controlPoints
      );
      const pdf = await renderInspectionProtocol(template, parameters);
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
              value={draft.templateKey ?? ''}
              onChange={(event) => void changeTemplate(event.target.value)}
              disabled={readOnly}
              data-cy="protocol-template"
            >
              <Select.Option value="">{t('common:inspection_protocol.template_placeholder')}</Select.Option>
              {INSPECTION_PROTOCOL_TEMPLATES.map((candidate) => (
                <Select.Option key={candidate.key} value={candidate.key}>
                  {candidate.label}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
          {template ? (
            <InspectionProtocolFields
              template={template}
              values={draft.values}
              readOnly={readOnly}
              onChange={(values) => updateDraft((current) => ({ ...current, values }))}
              position="before"
            />
          ) : null}
          {rows.length > 0 ? (
            <span className="text-small font-bold self-end" data-cy="measures-assessed">
              {t('common:inspection_protocol.assessed', { assessed, total: rows.length })}
              {' - '}
              {t('common:inspection_protocol.deficient', { count: deficient })}
            </span>
          ) : null}
          {rows.map((row, index) => (
            <InspectionProtocolMeasureCard
              key={row.id ?? `new-${index}`}
              index={index}
              row={row}
              attachments={measureById.get(row.id)?.attachments ?? []}
              readOnly={readOnly}
              busy={!!row.id && busyRowId === row.id}
              onChange={(changed) => setControlPoint(index, changed)}
              onRemove={() => removeControlPoint(index)}
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
              onClick={addControlPoint}
              data-cy="control-point-add"
            >
              {t('common:inspection_protocol.add_control_point')}
            </Button>
          </div>
          {template ? (
            <>
              <InspectionProtocolFields
                template={template}
                values={draft.values}
                readOnly={readOnly}
                onChange={(values) => updateDraft((current) => ({ ...current, values }))}
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
          <Disclosure variant="alt" className="w-full" data-cy="action-points">
            <Disclosure.Header>
              <Disclosure.Title>{t('common:inspection_protocol.action_points')}</Disclosure.Title>
              <Disclosure.Button />
            </Disclosure.Header>
            <Disclosure.Content>
              <InspectionProtocolActionPoints
                rows={draft.actionPoints}
                readOnly={readOnly}
                onChange={(actionPoints) => updateDraft((current) => ({ ...current, actionPoints }))}
              />
            </Disclosure.Content>
          </Disclosure>
        </div>
      ) : null}
    </div>
  );
};
