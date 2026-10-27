'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { saveSupportInvestigationSection } from '@supportmanagement/services/support-investigation-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { InvestigationSectionProps } from './investigation-section-text.component';

/** The fields of a section the backend lets a handler write. */
const SECTION_FIELDS = ['text', 'assessment'] as const;

type SectionField = (typeof SECTION_FIELDS)[number];
type SectionValues = Record<SectionField, string>;

const pick = (values: SectionValues, fields: SectionField[]): Partial<SectionValues> =>
  Object.fromEntries(fields.map((field) => [field, values[field]]));

/** Holds the writable fields of a section and registers the save the tab runs for it; only changed fields are sent. */
export const useInvestigationSectionSave = (
  { section, investigationId, writable, onEdited, onSaved, saveRef }: InvestigationSectionProps,
  saveFailedKey: string
) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const written = useMemo<SectionValues>(
    () => ({ text: section.text ?? '', assessment: section.assessment ?? '' }),
    [section.text, section.assessment]
  );
  const [values, setValues] = useState(written);
  const [loaded, setLoaded] = useState(written);
  const [busy, setBusy] = useState(false);

  const errandId = supportErrand?.id;
  const changedFields = useCallback(
    () => SECTION_FIELDS.filter((field) => values[field] !== loaded[field]),
    [values, loaded]
  );
  const edited = changedFields().length > 0;

  // A reread replaces each field that has no unsaved edit of its own.
  useEffect(() => {
    const reread = SECTION_FIELDS.filter((field) => written[field] !== loaded[field]);
    if (reread.length === 0) return;
    setValues((current) => ({
      ...current,
      ...pick(
        written,
        reread.filter((field) => current[field] === loaded[field])
      ),
    }));
    setLoaded((current) => ({ ...current, ...pick(written, reread) }));
  }, [written, loaded]);

  useEffect(() => {
    onEdited(edited);
  }, [edited, onEdited]);

  const save = useCallback(async (): Promise<boolean> => {
    const changed = changedFields();
    if (changed.length === 0 || !errandId || !investigationId || !section.id) return true;

    const sent = pick(values, changed);
    setBusy(true);
    try {
      onSaved(await saveSupportInvestigationSection(errandId, municipalityId, investigationId, section.id, sent));
      setLoaded((current) => ({ ...current, ...sent }));
      return true;
    } catch {
      toastMessage(getToastOptions({ message: t(saveFailedKey), status: 'error' }));
      return false;
    } finally {
      setBusy(false);
    }
  }, [
    changedFields,
    errandId,
    investigationId,
    municipalityId,
    onSaved,
    saveFailedKey,
    section.id,
    t,
    toastMessage,
    values,
  ]);

  useEffect(() => {
    saveRef.current = save;
  }, [save, saveRef]);

  const set = useCallback(
    (field: SectionField, value: string) => setValues((current) => ({ ...current, [field]: value })),
    []
  );

  return { values, set, readOnly: !writable || busy };
};
