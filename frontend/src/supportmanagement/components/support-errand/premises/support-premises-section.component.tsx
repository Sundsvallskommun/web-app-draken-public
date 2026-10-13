'use client';

import DynamicTextEditor from '@common/components/dynamic-text-editor';
import { useTextEditorPlaceholder } from '@common/components/use-text-editor-placeholder';
import type {
  Investigation,
  InvestigationSection,
  Statement,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { FormControl, FormLabel, Input, Select, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  saveSupportInvestigationSection,
  SUPPORT_INVESTIGATION_SECTION_TEXT_MAX_LENGTH,
} from '@supportmanagement/services/support-investigation-service';
import {
  SUPPORT_PREMISES_RIGHT_OF_DISPOSALS,
  supportPremisesCapacity,
  type SupportPremisesExamination,
  supportPremisesExamination,
  supportPremisesFireSafety,
  withSupportPremisesExamination,
} from '@supportmanagement/services/support-premises-examination-service';
import { getSupportStatements } from '@supportmanagement/services/support-statement-service';
import { FC, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';

export const SupportPremisesSection: FC<{
  section: InvestigationSection;
  investigationId: string | undefined;
  writable: boolean;
  onEdited: (edited: boolean) => void;
  onSaved: (investigation: Investigation) => void;
  saveRef: MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({ section, investigationId, writable, onEdited, onSaved, saveRef }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { getValues, setValue, watch } = useFormContext<SupportErrand>();

  const [statements, setStatements] = useState<Statement[]>([]);
  const [text, setText] = useState(section.text ?? '');
  const [loaded, setLoaded] = useState(section.text ?? '');
  const [busy, setBusy] = useState(false);

  const editorHost = useRef<HTMLDivElement>(null);
  useTextEditorPlaceholder(editorHost, t('common:premises.notes_placeholder'));

  const errandId = supportErrand?.id;
  const modified = supportErrand?.modified;
  const namespace = supportMetadata?.namespace;

  const capacity = useMemo(() => supportPremisesCapacity(supportErrand, namespace), [supportErrand, namespace]);
  const fireSafety = useMemo(
    () => supportPremisesFireSafety(statements, supportMetadata),
    [statements, supportMetadata]
  );
  const examination = supportPremisesExamination(watch('parameters'));

  const written = section.text ?? '';
  const edited = text !== loaded;

  useEffect(() => {
    if (!errandId || !municipalityId) return undefined;

    let reading = true;
    getSupportStatements(errandId, municipalityId)
      .then((result) => {
        if (reading) setStatements(result);
      })
      .catch(() => {
        if (reading) setStatements([]);
      });

    return () => {
      reading = false;
    };
  }, [errandId, municipalityId, modified]);

  useEffect(() => {
    if (written === loaded) return;
    if (!edited) setText(written);
    setLoaded(written);
  }, [written, loaded, edited]);

  useEffect(() => {
    onEdited(edited);
  }, [edited, onEdited]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!edited || !errandId || !investigationId || !section.id) return true;

    setBusy(true);
    try {
      onSaved(await saveSupportInvestigationSection(errandId, municipalityId, investigationId, section.id, { text }));
      setLoaded(text);
      return true;
    } catch {
      toastMessage(getToastOptions({ message: t('common:premises.toast.save_failed'), status: 'error' }));
      return false;
    } finally {
      setBusy(false);
    }
  }, [edited, errandId, investigationId, municipalityId, onSaved, section.id, t, text, toastMessage]);

  useEffect(() => {
    saveRef.current = save;
  }, [save, saveRef]);

  const write = (field: keyof SupportPremisesExamination, value: string) =>
    setValue('parameters', withSupportPremisesExamination(getValues('parameters'), field, value), {
      shouldDirty: true,
    });

  const seats = [
    capacity.indoorSeats ? t('common:premises.seats_indoor', { number: capacity.indoorSeats }) : undefined,
    capacity.outdoorSeats ? t('common:premises.seats_outdoor', { number: capacity.outdoorSeats }) : undefined,
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <div className="flex flex-col gap-24" data-cy="premises-section">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
        <FormControl className="min-w-0">
          <FormLabel className="text-small font-bold text-dark-secondary">
            {t('common:premises.inspected_at')}
          </FormLabel>
          <Input
            type="date"
            disabled={!writable}
            value={examination.inspectedAt}
            onChange={(event) => write('inspectedAt', event.target.value)}
            data-cy="premises-inspected-at"
          />
        </FormControl>

        <FormControl id="premises-right-of-disposal" className="min-w-0 flex flex-col">
          <FormLabel className="text-small font-bold text-dark-secondary">
            {t('common:premises.right_of_disposal.label')}
          </FormLabel>
          <div className="flex gap-8">
            <Select
              disabled={!writable}
              value={examination.rightOfDisposal}
              onChange={(event) => write('rightOfDisposal', event.target.value)}
              data-cy="premises-right-of-disposal"
            >
              <Select.Option value="">{t('common:premises.right_of_disposal.placeholder')}</Select.Option>
              {SUPPORT_PREMISES_RIGHT_OF_DISPOSALS.map((choice) => (
                <Select.Option key={choice.value} value={choice.value}>
                  {t(choice.translationKey)}
                </Select.Option>
              ))}
            </Select>
            <Input
              id="premises-right-of-disposal-note"
              aria-label={t('common:premises.right_of_disposal.note')}
              disabled={!writable}
              value={examination.rightOfDisposalNote}
              placeholder={t('common:premises.right_of_disposal.note_placeholder')}
              onChange={(event) => write('rightOfDisposalNote', event.target.value)}
              data-cy="premises-right-of-disposal-note"
            />
          </div>
        </FormControl>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
        <InvestigationFact label={t('common:premises.max_persons')}>
          <span data-cy="premises-max-persons">{capacity.maxPersons ?? t('common:premises.not_answered')}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:premises.seats')}>
          <span data-cy="premises-seats">{seats || t('common:premises.not_answered')}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:premises.fire_safety')}>
          <span data-cy="premises-fire-safety">
            {fireSafety
              ? `${fireSafety.outcome} (${fireSafety.counterparty})`
              : t('common:premises.fire_safety_pending')}
          </span>
        </InvestigationFact>
      </div>

      <FormControl className="w-full">
        <FormLabel>{t('common:premises.notes')}</FormLabel>
        <div ref={editorHost} data-cy="premises-text">
          <DynamicTextEditor
            name="premises-notes"
            className="investigation-text-editor w-full min-w-0 max-w-full"
            readOnly={!writable || busy}
            value={{ markup: text }}
            onChange={(event: { target: { value: { markup?: string } } }) =>
              setText((event.target.value.markup ?? '').slice(0, SUPPORT_INVESTIGATION_SECTION_TEXT_MAX_LENGTH))
            }
          />
        </div>
      </FormControl>

      <p className="text-small text-dark-secondary italic m-0">{t('common:premises.requirement_note')}</p>
    </div>
  );
};
