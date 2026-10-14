'use client';

import DynamicTextEditor from '@common/components/dynamic-text-editor';
import { useTextEditorPlaceholder } from '@common/components/use-text-editor-placeholder';
import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { FormControl, FormLabel, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  saveSupportInvestigationSection,
  SUPPORT_INVESTIGATION_SECTION_TEXT_MAX_LENGTH,
} from '@supportmanagement/services/support-investigation-service';
import { FC, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** What the investigation tab hands every section so the section can save itself when the tab saves. */
export interface InvestigationSectionProps {
  section: InvestigationSection;
  investigationId: string | undefined;
  writable: boolean;
  onEdited: (edited: boolean) => void;
  onSaved: (investigation: Investigation) => void;
  saveRef: MutableRefObject<(() => Promise<boolean>) | undefined>;
}

interface WrittenPart {
  name: string;
  labelKey: string;
  placeholderKey: string;
  saveFailedKey: string;
}

export const InvestigationSectionText: FC<InvestigationSectionProps & WrittenPart> = ({
  section,
  investigationId,
  writable,
  onEdited,
  onSaved,
  saveRef,
  name,
  labelKey,
  placeholderKey,
  saveFailedKey,
}) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const [text, setText] = useState(section.text ?? '');
  const [loaded, setLoaded] = useState(section.text ?? '');
  const [busy, setBusy] = useState(false);

  const editorHost = useRef<HTMLDivElement>(null);
  useTextEditorPlaceholder(editorHost, t(placeholderKey));

  const errandId = supportErrand?.id;
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
      toastMessage(getToastOptions({ message: t(saveFailedKey), status: 'error' }));
      return false;
    } finally {
      setBusy(false);
    }
  }, [edited, errandId, investigationId, municipalityId, onSaved, saveFailedKey, section.id, t, text, toastMessage]);

  useEffect(() => {
    saveRef.current = save;
  }, [save, saveRef]);

  return (
    <FormControl className="w-full">
      <FormLabel>{t(labelKey)}</FormLabel>
      <div ref={editorHost} data-cy={`${name}-text`}>
        <DynamicTextEditor
          name={name}
          className="investigation-text-editor w-full min-w-0 max-w-full"
          readOnly={!writable || busy}
          value={{ markup: text }}
          onChange={(event: { target: { value: { markup?: string } } }) =>
            setText((event.target.value.markup ?? '').slice(0, SUPPORT_INVESTIGATION_SECTION_TEXT_MAX_LENGTH))
          }
        />
      </div>
    </FormControl>
  );
};
