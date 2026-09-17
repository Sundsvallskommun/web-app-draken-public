import { IErrand } from '@casedata/interfaces/errand';
import { fetchAttachment, fetchDecisionAttachment } from '@casedata/services/casedata-attachment-service';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Attachment } from 'src/data-contracts/backend/data-contracts';

// Small enough that a long attachment list does not fire every request at once.
const PREVIEW_BATCH_SIZE = 3;

/**
 * Owns the base64 content of an errand's attachments: the cache itself, the bookkeeping that
 * keeps a refetched errand from re-requesting the same file, and the batched prefetch that fills
 * the list previews. Callers get the cache plus two operations and never touch the internals.
 */
export function useAttachmentContents(municipalityId: string, errand: IErrand | undefined) {
  // Attachment content is no longer part of the errand payload, so it is fetched per attachment
  // and cached here, keyed by attachment id.
  const [contents, setContents] = useState<Record<number, string>>({});
  // Attachment ids whose content has been requested, so repeated errand refreshes do not
  // re-request content that is already on its way.
  const requestedIds = useRef<Set<number>>(new Set());
  const isMounted = useRef(true);

  const errandId = errand?.id;
  const attachments = errand?.attachments;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Cached content belongs to one errand; drop it when navigating to another so it does not
  // accumulate for the lifetime of the session. The content is cleared while rendering, which is
  // React's documented way to reset state on a changed input — an effect would leave one render
  // where the previous errand's content is paired with the new errand's attachments. Re-running
  // it is harmless, so a StrictMode double render changes nothing.
  const [cachedErrandId, setCachedErrandId] = useState(errandId);
  if (errandId !== cachedErrandId) {
    setCachedErrandId(errandId);
    setContents({});
  }

  // The matching bookkeeping reset lives in an effect because a ref must not be written during
  // render. Declared before the prefetch below so it runs first when the errand changes.
  useEffect(() => {
    requestedIds.current = new Set();
  }, [errandId]);

  // Fetch the content of image attachments so the list can show previews.
  useEffect(() => {
    if (!errandId || !attachments?.length) return;

    // Tracked in a ref rather than against the cached content, because the errand is refetched
    // several times while the first request is still in flight — keying off the fetched content
    // would request the same attachment once per refetch.
    const missing = attachments.filter(
      (a): a is Attachment & { id: number } =>
        imageMimeTypes.includes(a.mimeType) && !!a.id && !requestedIds.current.has(a.id)
    );
    if (missing.length === 0) return;
    missing.forEach((a) => requestedIds.current.add(a.id));

    const fetchPreviews = async () => {
      for (let i = 0; i < missing.length; i += PREVIEW_BATCH_SIZE) {
        if (!isMounted.current) break;
        const batch = missing.slice(i, i + PREVIEW_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((a) =>
            (a.decisionId
              ? fetchDecisionAttachment(municipalityId, errandId, a.decisionId, a)
              : fetchAttachment(municipalityId, errandId, a)
            ).then((res) => [a.id, res] as const)
          )
        );
        if (!isMounted.current) break;

        const fetched: Record<number, string> = {};
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const [id, res] = result.value;
            fetched[id] = res.base64EncodedString;
          } else {
            // Let a later errand refresh retry this one.
            requestedIds.current.delete(batch[index].id);
          }
        });
        if (Object.keys(fetched).length > 0) {
          setContents((prev) => ({ ...prev, ...fetched }));
        }
      }
    };

    fetchPreviews();
    // No cleanup that cancels in-flight work: the errand is refetched while requests are still
    // running, and cancelling on every rerun would abandon them without clearing the requested
    // set, leaving previews permanently empty.
  }, [errandId, attachments, municipalityId]);

  /** Stores content the caller already fetched, so the prefetch does not request it again. */
  const cacheContent = useCallback((id: number, base64EncodedString: string) => {
    requestedIds.current.add(id);
    setContents((prev) => ({ ...prev, [id]: base64EncodedString }));
  }, []);

  /** Forgets an attachment that no longer exists, so its id is not pinned for the session. */
  const dropContent = useCallback((id: number) => {
    requestedIds.current.delete(id);
    setContents((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return { contents, cacheContent, dropContent };
}
