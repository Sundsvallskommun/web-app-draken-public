import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import { useCallback, useEffect } from 'react';

/**
 * The errand's attachments, fetched by whoever shows them, so the attachments block
 * works wherever it is placed on the page. Other parts of the page read the same list
 * from the store.
 */
export const useSupportAttachments = () => {
  const errandId = useSupportStore((s) => s.supportErrand?.id);
  const attachments = useSupportStore((s) => s.supportAttachments);
  const setSupportAttachments = useSupportStore((s) => s.setSupportAttachments);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const fetchAttachments = useCallback(async () => {
    if (!errandId) return;
    setSupportAttachments(await getSupportAttachments(errandId, municipalityId));
  }, [errandId, municipalityId, setSupportAttachments]);

  // The store keeps the previous errand's list until someone reads the new one.
  useEffect(() => {
    fetchAttachments().catch(() => undefined);
  }, [fetchAttachments]);

  /**
   * After an attachment changed: the errand changed with it, so both are read again.
   * It never rejects, so a failed reload is not reported as a failed upload or delete.
   */
  const refresh = useCallback(async () => {
    if (!errandId) return;
    await Promise.allSettled([
      fetchAttachments(),
      getSupportErrandById(errandId, municipalityId).then((res) => setSupportErrand(res.errand)),
    ]);
  }, [errandId, municipalityId, fetchAttachments, setSupportErrand]);

  return { attachments, refresh };
};
