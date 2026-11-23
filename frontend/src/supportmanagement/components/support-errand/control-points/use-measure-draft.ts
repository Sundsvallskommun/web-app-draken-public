import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import {
  getSupportMeasures,
  saveSupportMeasures,
  supportMeasureChanges,
  type SupportMeasureRow,
  supportMeasureRow,
  supportMeasuresOfType,
  type SupportMeasureTypeName,
} from '@supportmanagement/services/support-measure-service';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * One type of the errand's measures as a draft the handler edits: read once per errand, written with Spara ärende
 * under a saver key of its own, and marked unsaved while it differs from what is saved. Each type is written by
 * its own draft only, so two sections with different types never write over each other.
 */
export const useMeasureDraft = (type: SupportMeasureTypeName, saverKey: string, saveErrorKey: string) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const setUnsavedTab = useSupportStore((s) => s.setUnsavedTab);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);

  const errandId = supportErrand?.id;
  const readOnly = !canEdit || !supportErrand || isSupportErrandLocked(supportErrand);

  /** All of the errand's measures as saved; the photos are read from here. */
  const [measures, setMeasures] = useState<Measure[]>();
  /** This type's rows as saved, to tell what the handler changed. */
  const [baseline, setBaseline] = useState<SupportMeasureRow[]>([]);
  const [rows, setRows] = useState<SupportMeasureRow[]>([]);
  /** The errand whose measures were last read, or failed to be; until it is this one, the section is loading. */
  const [readFor, setReadFor] = useState<string>();
  const [error, setError] = useState(false);

  const receive = useCallback(
    (saved: Measure[]) => {
      const ofType = supportMeasuresOfType(saved, type).map(supportMeasureRow);
      setMeasures(saved);
      setBaseline(ofType);
      setRows(ofType);
    },
    [type]
  );

  // Read once per errand and after each save, so a reload never overwrites what the handler has written.
  useEffect(() => {
    if (!errandId || !municipalityId) return undefined;
    let current = true;
    getSupportMeasures(errandId, municipalityId)
      .then((saved) => {
        if (!current) return;
        receive(saved);
        setError(false);
      })
      .catch(() => current && setError(true))
      .finally(() => current && setReadFor(errandId));
    return () => {
      current = false;
    };
  }, [errandId, municipalityId, receive]);

  const loading = readFor !== errandId;
  const edited = !!measures && !same(rows, baseline);

  useEffect(() => {
    setUnsavedTab(saverKey, edited);
    return () => setUnsavedTab(saverKey, false);
  }, [edited, saverKey, setUnsavedTab]);

  const save = async (): Promise<boolean> => {
    if (!errandId || !municipalityId || !measures || !edited) return true;
    try {
      await saveSupportMeasures(errandId, municipalityId, [supportMeasureChanges(type, rows, baseline)]);
      receive(await getSupportMeasures(errandId, municipalityId));
      return true;
    } catch (e) {
      console.error(`Something went wrong when saving the ${type} measures`, e);
      toastMessage(getToastOptions({ status: 'error', message: t(saveErrorKey) }));
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
    setTabSaver(saverKey, saver);
    return () => setTabSaver(saverKey, undefined);
  }, [saver, saverKey, setTabSaver]);

  /** A photo changes the saved measure only; the rows are left as they are. */
  const replaceSaved = (replacement: Measure) =>
    setMeasures((current) => current?.map((measure) => (measure.id === replacement.id ? replacement : measure)));

  return { errandId, municipalityId, readOnly, measures, rows, setRows, loading, error, replaceSaved };
};
