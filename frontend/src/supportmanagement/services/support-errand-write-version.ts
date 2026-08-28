declare const strongSupportErrandETagBrand: unique symbol;

/** A canonical, strong Support Management errand ETag, for example `"7"`. */
export type StrongSupportErrandETag = string & { readonly [strongSupportErrandETagBrand]: true };

/**
 * Converts a version from a loaded errand into the exact optimistic-locking
 * precondition expected by the BFF. Invalid or absent concurrency state must
 * stop a write before any request is sent.
 */
export const toStrongSupportErrandETag = (version: unknown): StrongSupportErrandETag => {
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    throw new Error('A valid support errand version is required before writing');
  }

  return `"${version}"` as StrongSupportErrandETag;
};

/**
 * The BFF refuses a write whose loaded errand no longer matches upstream: 412 when the
 * If-Match version has moved on, 409 when the errand's status changed under the open view
 * (a transition applied elsewhere, or an errand closed in the meantime). Both mean the same
 * thing to the user and are recovered the same way, so they share one message.
 */
const SUPPORT_ERRAND_WRITE_CONFLICT_STATUSES: ReadonlySet<number> = new Set([409, 412]);

export const SUPPORT_ERRAND_WRITE_CONFLICT_MESSAGE =
  'Ärendet har uppdaterats av någon annan. Ladda om ärendet och gör om ändringen.';

/** Reads the response status from an Axios rejection without depending on its error class. */
const getResponseStatus = (error: unknown): number | undefined => {
  const response = (error as { response?: { status?: unknown } } | null | undefined)?.response;

  return typeof response?.status === 'number' ? response.status : undefined;
};

export const isSupportErrandWriteConflict = (error: unknown): boolean => {
  const status = getResponseStatus(error);

  return status !== undefined && SUPPORT_ERRAND_WRITE_CONFLICT_STATUSES.has(status);
};

/** Picks the user-facing message for a failed errand write: conflicts get the reload advice. */
export const supportErrandWriteErrorMessage = (error: unknown, fallback: string): string =>
  isSupportErrandWriteConflict(error) ? SUPPORT_ERRAND_WRITE_CONFLICT_MESSAGE : fallback;
