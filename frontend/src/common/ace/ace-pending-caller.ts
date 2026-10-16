/**
 * Hands the caller's personal number over from the tab that received the ACE screen pop to the
 * tab that opens the new errand. The value never travels in a URL: it is kept in localStorage
 * under the errand number for at most PENDING_CALLER_TTL_MS and removed as soon as it is read.
 */

const KEY_PREFIX = 'draken-ace-caller:';
const PENDING_CALLER_TTL_MS = 2 * 60 * 1000;

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

interface PendingCaller {
  personNumber: string;
  expiresAt: number;
}

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
    return typeof entry?.personNumber === 'string' && typeof entry?.expiresAt === 'number' ? entry : null;
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
  personNumber: string,
  storage = browserStorage(),
  now = Date.now()
): void => {
  try {
    storage?.setItem(
      `${KEY_PREFIX}${errandNumber}`,
      JSON.stringify({ personNumber, expiresAt: now + PENDING_CALLER_TTL_MS } satisfies PendingCaller)
    );
  } catch {
    // Storage unavailable or full: the errand still opens, just without a pre-filled customer.
  }
};

/** Returns the caller's personal number handed over for this errand, at most once. */
export const takePendingCaller = (
  errandNumber: string,
  storage = browserStorage(),
  now = Date.now()
): string | null => {
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
  return entry && entry.expiresAt > now ? entry.personNumber : null;
};
