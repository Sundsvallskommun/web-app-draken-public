/**
 * Remembers which ACE contacts already got an errand, across tabs and reloads. ACE can repeat a
 * screen pop for the same contact, also to a tab that just took over the integration (e.g. after
 * the leading tab was reloaded), so an in-memory set is not enough to avoid duplicate errands.
 */

const KEY_PREFIX = 'draken-ace-contact:';
const HANDLED_CONTACT_TTL_MS = 10 * 60 * 1000;

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

const browserStorage = (): KeyValueStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const removeExpired = (storage: KeyValueStorage, now: number) => {
  const expired: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(KEY_PREFIX) && !(Number(storage.getItem(key)) > now)) {
      expired.push(key);
    }
  }
  expired.forEach((key) => storage.removeItem(key));
};

/**
 * Marks the contact as handled. Returns false when it already was within the last ten minutes,
 * in which case no errand should be created. Without storage every contact counts as new.
 */
export const markContactHandled = (contactId: string, storage = browserStorage(), now = Date.now()): boolean => {
  if (!storage) {
    return true;
  }
  try {
    removeExpired(storage, now);
    const key = `${KEY_PREFIX}${contactId}`;
    if (storage.getItem(key) !== null) {
      return false;
    }
    storage.setItem(key, String(now + HANDLED_CONTACT_TTL_MS));
    return true;
  } catch {
    return true;
  }
};
