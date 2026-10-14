import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { Button, FormControl, FormLabel, Input, Select, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import {
  getSupportMeasures,
  hasSupportMeasureChanges,
  saveSupportMeasures,
  supportMeasureChanges,
  type SupportMeasureRow,
  supportMeasureRows,
  supportMeasuresOfType,
  SupportMeasureType,
} from '@supportmanagement/services/support-measure-service';
import {
  SUPPORT_MEASURE_TEMPLATES,
  type SupportMeasureTemplate,
} from '@supportmanagement/services/support-measure-templates';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ListType = typeof SupportMeasureType.INTERNAL | typeof SupportMeasureType.EXTERNAL;

/** Each type is its own list with its own texts and tab saver; only control points start from a template. */
const LISTS: Record<ListType, { tabKey: string; texts: string; templates: SupportMeasureTemplate[] }> = {
  [SupportMeasureType.INTERNAL]: { tabKey: 'measures', texts: 'common:measures', templates: SUPPORT_MEASURE_TEMPLATES },
  [SupportMeasureType.EXTERNAL]: { tabKey: 'action_points', texts: 'common:action_points', templates: [] },
};

interface MeasureList {
  /** The errand's list this was loaded from, to notice when the errand has been read again. */
  source: Measure[] | undefined;
  saved: Measure[];
  rows: SupportMeasureRow[];
}

const listOf = (measures: Measure[] | undefined): MeasureList => ({
  source: measures,
  saved: measures ?? [],
  rows: supportMeasureRows(measures),
});

const isEdited = (list: MeasureList): boolean => hasSupportMeasureChanges(supportMeasureChanges(list.rows, list.saved));

export const SupportErrandMeasures: React.FC<{ measureType: ListType }> = ({ measureType }) => {
  const { t } = useTranslation();
  const { tabKey, texts, templates } = LISTS[measureType];
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const setUnsavedTab = useSupportStore((s) => s.setUnsavedTab);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const toastMessage = useSnackbar();

  const errandId = supportErrand?.id;
  const allMeasures = supportErrand?.measures;
  const measures = useMemo(() => supportMeasuresOfType(allMeasures, measureType), [allMeasures, measureType]);
  const readOnly = !canEdit || !supportErrand || isSupportErrandLocked(supportErrand);

  const [list, setList] = useState<MeasureList>(() => listOf(measures));
  const [templateKey, setTemplateKey] = useState('');
  const changes = useMemo(() => supportMeasureChanges(list.rows, list.saved), [list]);
  const edited = hasSupportMeasureChanges(changes);

  if (list.source !== measures) {
    setList(isEdited(list) ? { ...list, source: measures } : listOf(measures));
  }

  useEffect(() => {
    setUnsavedTab(tabKey, edited);
    return () => setUnsavedTab(tabKey, false);
  }, [edited, setUnsavedTab, tabKey]);

  const save = async (): Promise<boolean> => {
    if (!errandId || !municipalityId) return true;
    try {
      await saveSupportMeasures(errandId, municipalityId, measureType, changes);
      const latest = supportMeasuresOfType(await getSupportMeasures(errandId, municipalityId), measureType);
      setList((current) => ({ ...listOf(latest), source: current.source }));
      return true;
    } catch (e) {
      console.error('Something went wrong when saving the measures', e);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t(`${texts}.save_error`),
        status: 'error',
      });
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
    setTabSaver(tabKey, saver);
    return () => setTabSaver(tabKey, undefined);
  }, [saver, setTabSaver, tabKey]);

  const setRows = (rows: SupportMeasureRow[]) => setList((current) => ({ ...current, rows }));

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    const template = templates.find((candidate) => candidate.key === key);
    if (template) setRows(template.titles.map((title) => ({ title })));
  };

  const setTitle = (index: number, title: string) =>
    setRows(list.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, title } : row)));
  const removeRow = (index: number) => setRows(list.rows.filter((_, rowIndex) => rowIndex !== index));
  const addRow = () => setRows([...list.rows, { title: '' }]);

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy={`measures-${measureType}`}>
      <h3 className="text-h3-md">{t(`${texts}.heading`)}</h3>
      <p className="text-small text-dark-secondary m-0">{t(`${texts}.description`)}</p>
      {templates.length > 0 ? (
        <FormControl id="measure-template" className="w-full max-w-[32rem]">
          <FormLabel>{t(`${texts}.template`)}</FormLabel>
          <Select
            value={templateKey}
            onChange={(event) => applyTemplate(event.target.value)}
            disabled={readOnly}
            data-cy="measure-template"
          >
            <Select.Option value="">{t(`${texts}.template_placeholder`)}</Select.Option>
            {templates.map((template) => (
              <Select.Option key={template.key} value={template.key}>
                {template.label}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      ) : null}
      <span className="font-bold">{t(`${texts}.count`, { count: list.rows.length })}</span>
      <ol className="flex flex-col gap-8 m-0 p-0 list-none">
        {list.rows.map((row, index) => (
          <li key={row.id ?? `new-${index}`} className="flex items-center gap-8">
            <span className="w-24 text-right text-dark-secondary">{index + 1}.</span>
            <Input
              className="w-full"
              value={row.title}
              onChange={(event) => setTitle(index, event.target.value)}
              disabled={readOnly}
              aria-label={t(`${texts}.row`, { number: index + 1 })}
            />
            <Button
              iconButton
              variant="tertiary"
              showBackground={false}
              onClick={() => removeRow(index)}
              disabled={readOnly}
              aria-label={t(`${texts}.remove`, { number: index + 1 })}
            >
              <X size={16} className="text-error" />
            </Button>
          </li>
        ))}
      </ol>
      <div>
        <Button
          variant="primary"
          inverted
          color="vattjom"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={addRow}
          disabled={readOnly}
          data-cy="measure-add"
        >
          {t(`${texts}.add`)}
        </Button>
      </div>
    </section>
  );
};
