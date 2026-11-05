'use client';

import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  saveSupportInvestigationSection,
  saveSupportInvestigationSectionJsonParameter,
  type SupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import {
  type JsonObject,
  jsonParameterObject,
  jsonParameterSchemaId,
  sameJson,
} from '@supportmanagement/services/support-json-parameter-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { InvestigationSectionProps } from './investigation-section-text.component';

/** The fields of a section the backend lets a handler write; `json` is the section's JSON parameter. */
const SECTION_FIELDS = ['text', 'assessment', 'json'] as const;

type SectionField = (typeof SECTION_FIELDS)[number];
interface SectionValues {
  text: string;
  assessment: string;
  json: JsonObject;
}

const pick = (values: SectionValues, fields: SectionField[]): Partial<SectionValues> =>
  Object.fromEntries(fields.map((field) => [field, values[field]])) as Partial<SectionValues>;

const differs = (a: SectionValues, b: SectionValues, field: SectionField): boolean => !sameJson(a[field], b[field]);

/** Holds the writable fields of a section and registers the save the tab runs for it; only changed fields are sent. */
export const useInvestigationSectionSave = (
  { section, investigationId, writable, onEdited, onSaved, saveRef }: InvestigationSectionProps,
  saveFailedKey: string,
  jsonSchemaName?: string
) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const written = useMemo<SectionValues>(
    () => ({
      text: section.text ?? '',
      assessment: section.assessment ?? '',
      json: (jsonSchemaName && jsonParameterObject(section.jsonParameters, jsonSchemaName)) || {},
    }),
    [section.text, section.assessment, section.jsonParameters, jsonSchemaName]
  );
  const [values, setValues] = useState(written);
  const [loaded, setLoaded] = useState(written);
  const [busy, setBusy] = useState(false);

  const errandId = supportErrand?.id;
  const changedFields = useCallback(
    () => SECTION_FIELDS.filter((field) => differs(values, loaded, field)),
    [values, loaded]
  );
  const edited = changedFields().length > 0;

  // A reread replaces each field that has no unsaved edit of its own.
  useEffect(() => {
    const reread = SECTION_FIELDS.filter((field) => differs(written, loaded, field));
    if (reread.length === 0) return;
    setValues((current) => ({
      ...current,
      ...pick(
        written,
        reread.filter((field) => !differs(current, loaded, field))
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
    const { json, ...fields } = sent;
    setBusy(true);
    try {
      let saved: SupportInvestigation | undefined;
      if (Object.keys(fields).length > 0) {
        saved = await saveSupportInvestigationSection(errandId, municipalityId, investigationId, section.id, fields);
      }
      if (json && jsonSchemaName) {
        saved = await saveSupportInvestigationSectionJsonParameter(
          errandId,
          municipalityId,
          investigationId,
          section.id,
          jsonSchemaName,
          { schemaId: await jsonParameterSchemaId(section.jsonParameters, municipalityId, jsonSchemaName), value: json }
        );
      }
      if (saved) onSaved(saved);
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
    jsonSchemaName,
    municipalityId,
    onSaved,
    saveFailedKey,
    section.id,
    section.jsonParameters,
    t,
    toastMessage,
    values,
  ]);

  useEffect(() => {
    saveRef.current = save;
  }, [save, saveRef]);

  const set = useCallback(
    <F extends SectionField>(field: F, value: SectionValues[F]) =>
      setValues((current) => ({ ...current, [field]: value })),
    []
  );

  return { values, set, readOnly: !writable || busy };
};
