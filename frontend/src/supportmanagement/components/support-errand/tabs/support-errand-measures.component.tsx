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
} from '@supportmanagement/services/support-measure-service';
import { SUPPORT_MEASURE_TEMPLATES } from '@supportmanagement/services/support-measure-templates';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const TAB_KEY = 'measures';

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

export const SupportErrandMeasures: React.FC<{ measureType: string }> = ({ measureType }) => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const setUnsavedTab = useSupportStore((s) => s.setUnsavedTab);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const toastMessage = useSnackbar();

  const errandId = supportErrand?.id;
  const measures = supportErrand?.measures;
  const readOnly = !canEdit || !supportErrand || isSupportErrandLocked(supportErrand);

  const [list, setList] = useState<MeasureList>(() => listOf(measures));
  const [templateKey, setTemplateKey] = useState('');
  const changes = useMemo(() => supportMeasureChanges(list.rows, list.saved), [list]);
  const edited = hasSupportMeasureChanges(changes);

  if (list.source !== measures) {
    setList(isEdited(list) ? { ...list, source: measures } : listOf(measures));
  }

  useEffect(() => {
    setUnsavedTab(TAB_KEY, edited);
    return () => setUnsavedTab(TAB_KEY, false);
  }, [edited, setUnsavedTab]);

  const save = async (): Promise<boolean> => {
    if (!errandId || !municipalityId) return true;
    try {
      await saveSupportMeasures(errandId, municipalityId, measureType, changes);
      const latest = await getSupportMeasures(errandId, municipalityId);
      setList((current) => ({ ...listOf(latest), source: current.source }));
      return true;
    } catch (e) {
      console.error('Something went wrong when saving the measures', e);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t('common:measures.save_error'),
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
    setTabSaver(TAB_KEY, saver);
    return () => setTabSaver(TAB_KEY, undefined);
  }, [saver, setTabSaver]);

  const setRows = (rows: SupportMeasureRow[]) => setList((current) => ({ ...current, rows }));

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    const template = SUPPORT_MEASURE_TEMPLATES.find((candidate) => candidate.key === key);
    if (template) setRows(template.titles.map((title) => ({ title })));
  };

  const setTitle = (index: number, title: string) =>
    setRows(list.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, title } : row)));
  const removeRow = (index: number) => setRows(list.rows.filter((_, rowIndex) => rowIndex !== index));
  const addRow = () => setRows([...list.rows, { title: '' }]);

  return (
    <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy="inspection-measures">
      <h3 className="text-h3-md">{t('common:measures.heading')}</h3>
      <p className="text-small text-dark-secondary m-0">{t('common:measures.description')}</p>
      <FormControl id="measure-template" className="w-full max-w-[32rem]">
        <FormLabel>{t('common:measures.template')}</FormLabel>
        <Select
          value={templateKey}
          onChange={(event) => applyTemplate(event.target.value)}
          disabled={readOnly}
          data-cy="measure-template"
        >
          <Select.Option value="">{t('common:measures.template_placeholder')}</Select.Option>
          {SUPPORT_MEASURE_TEMPLATES.map((template) => (
            <Select.Option key={template.key} value={template.key}>
              {template.label}
            </Select.Option>
          ))}
        </Select>
      </FormControl>
      <span className="font-bold">{t('common:measures.count', { count: list.rows.length })}</span>
      <ol className="flex flex-col gap-8 m-0 p-0 list-none">
        {list.rows.map((row, index) => (
          <li key={row.id ?? `new-${index}`} className="flex items-center gap-8">
            <span className="w-24 text-right text-dark-secondary">{index + 1}.</span>
            <Input
              className="w-full"
              value={row.title}
              onChange={(event) => setTitle(index, event.target.value)}
              disabled={readOnly}
              aria-label={t('common:measures.row', { number: index + 1 })}
            />
            <Button
              iconButton
              variant="tertiary"
              showBackground={false}
              onClick={() => removeRow(index)}
              disabled={readOnly}
              aria-label={t('common:measures.remove', { number: index + 1 })}
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
          {t('common:measures.add')}
        </Button>
      </div>
    </section>
  );
};
