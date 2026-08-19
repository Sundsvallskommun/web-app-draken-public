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
