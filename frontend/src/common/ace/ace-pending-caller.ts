import type { AceCaller } from './ace-screen-pop';

/**
 * Hands the caller's personal number or phone number over from the tab that received the ACE screen
 * pop to the tab that opens the new errand. The values never travel in a URL: they are kept in
 * localStorage under the errand number for at most PENDING_CALLER_TTL_MS and removed as soon as
 * they are read.
 */

const KEY_PREFIX = 'draken-ace-caller:';
export const PENDING_CALLER_TTL_MS = 2 * 60 * 1000;

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/** What the new errand's tab gets to know about the caller. */
export type HandedOverCaller = Pick<AceCaller, 'personNumber' | 'phoneNumber'>;

interface PendingCaller extends HandedOverCaller {
  expiresAt: number;
}

const optionalString = (value: unknown): boolean => value === undefined || typeof value === 'string';

const browserStorage = (): KeyValueStorage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readEntry = (storage: KeyValueStorage, key: string): PendingCaller | null => {
  try {
    const entry = JSON.parse(storage.getItem(key) ?? 'null');
    const valid =
      typeof entry?.expiresAt === 'number' &&
      (!!entry.personNumber || !!entry.phoneNumber) &&
      optionalString(entry.personNumber) &&
      optionalString(entry.phoneNumber);
    return valid ? entry : null;
  } catch {
    return null;
  }
};

/** Removes every expired or unreadable hand-over, e.g. from a tab that never opened. */
export const removeExpiredPendingCallers = (storage = browserStorage(), now = Date.now()): void => {
  if (!storage) {
    return;
  }
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(KEY_PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach((key) => {
    const entry = readEntry(storage, key);
    if (!entry || entry.expiresAt <= now) {
      storage.removeItem(key);
    }
  });
};

export const storePendingCaller = (
  errandNumber: string,
  { personNumber, phoneNumber }: HandedOverCaller,
  storage = browserStorage(),
  now = Date.now()
): void => {
  try {
    storage?.setItem(
      `${KEY_PREFIX}${errandNumber}`,
      JSON.stringify({ personNumber, phoneNumber, expiresAt: now + PENDING_CALLER_TTL_MS } satisfies PendingCaller)
    );
  } catch {
    // Storage unavailable or full: the errand still opens, just without a pre-filled customer.
  }
};

/** Drops the hand-over for an errand that will not be opened, e.g. when navigation was cancelled. */
export const removePendingCaller = (errandNumber: string, storage = browserStorage()): void => {
  try {
    storage?.removeItem(`${KEY_PREFIX}${errandNumber}`);
  } catch {
    // Ignore: the entry expires anyway.
  }
};

/** Returns the caller handed over for this errand, at most once. */
export const takePendingCaller = (
  errandNumber: string,
  storage = browserStorage(),
  now = Date.now()
): HandedOverCaller | null => {
  if (!storage || !errandNumber) {
    return null;
  }
  const key = `${KEY_PREFIX}${errandNumber}`;
  const entry = readEntry(storage, key);
  try {
    storage.removeItem(key);
  } catch {
    // Ignore: the entry expires anyway.
  }
  return entry && entry.expiresAt > now ? { personNumber: entry.personNumber, phoneNumber: entry.phoneNumber } : null;
};
