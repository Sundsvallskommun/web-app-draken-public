'use client';

import DynamicTextEditor from '@common/components/dynamic-text-editor';
import { useTextEditorPlaceholder } from '@common/components/use-text-editor-placeholder';
import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { FormControl, FormLabel, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  supportFinancingNotes,
  supportFinancingSourceLine,
  supportFinancingSources,
} from '@supportmanagement/services/support-financial-suitability-service';
import {
  saveSupportInvestigationSection,
  SUPPORT_INVESTIGATION_SECTION_TEXT_MAX_LENGTH,
} from '@supportmanagement/services/support-investigation-service';
import { FC, MutableRefObject, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Fact: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-4 min-w-0">
    <span className="text-small font-bold text-dark-secondary">{label}</span>
    {children}
  </div>
);

export const SupportFinancialSuitabilitySection: FC<{
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
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [text, setText] = useState(section.text ?? '');
  const [loaded, setLoaded] = useState(section.text ?? '');
  const [busy, setBusy] = useState(false);

  const editorHost = useRef<HTMLDivElement>(null);
  useTextEditorPlaceholder(editorHost, t('common:financial_suitability.assessment_placeholder'));

  const errandId = supportErrand?.id;
  const sources = useMemo(() => supportFinancingSources(supportErrand), [supportErrand]);
  const notes = useMemo(() => supportFinancingNotes(supportErrand), [supportErrand]);

  const written = section.text ?? '';
  const edited = text !== loaded;

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
      toastMessage(getToastOptions({ message: t('common:financial_suitability.toast.save_failed'), status: 'error' }));
      return false;
    } finally {
      setBusy(false);
    }
  }, [edited, errandId, investigationId, municipalityId, onSaved, section.id, t, text, toastMessage]);

  useEffect(() => {
    saveRef.current = save;
  }, [save, saveRef]);

  return (
    <div className="flex flex-col gap-24" data-cy="financial-suitability-section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        <Fact label={t('common:financial_suitability.financing')}>
          {sources.length === 0 ? (
            <span className="text-dark-secondary" data-cy="financing-none">
              {t('common:financial_suitability.financing_none')}
            </span>
          ) : (
            <ul className="m-0 pl-0 list-none flex flex-col gap-2" data-cy="financing-sources">
              {sources.map((source, index) => (
                <li key={`${source.kind}-${source.lender}-${index}`}>{supportFinancingSourceLine(source)}</li>
              ))}
            </ul>
          )}
        </Fact>

        {notes ? (
          <Fact label={t('common:financial_suitability.financing_notes')}>
            <span data-cy="financing-notes">{notes}</span>
          </Fact>
        ) : null}
      </div>

      <FormControl className="w-full">
        <FormLabel>{t('common:financial_suitability.assessment')}</FormLabel>
        <div ref={editorHost} data-cy="financial-suitability-text">
          <DynamicTextEditor
            name="financial-suitability"
            className="investigation-text-editor w-full min-w-0 max-w-full"
            readOnly={!writable || busy}
            value={{ markup: text }}
            onChange={(event: { target: { value: { markup?: string } } }) =>
              setText((event.target.value.markup ?? '').slice(0, SUPPORT_INVESTIGATION_SECTION_TEXT_MAX_LENGTH))
            }
          />
        </div>
      </FormControl>
    </div>
  );
};
