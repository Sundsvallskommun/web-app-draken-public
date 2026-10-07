import { beforeEach, describe, expect, test } from 'vitest';

import { removeExpiredPendingCallers, storePendingCaller, takePendingCaller } from './ace-pending-caller';

// Test person number from Skatteverket, not a real person.
const personNumber = '199001012385';
const now = 1_700_000_000_000;
const twoMinutes = 2 * 60 * 1000;

class MemoryStorage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key = (index: number) => [...this.items.keys()][index] ?? null;
  getItem = (key: string) => this.items.get(key) ?? null;
  setItem = (key: string, value: string) => void this.items.set(key, value);
  removeItem = (key: string) => void this.items.delete(key);
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe('pending ACE caller hand-over', () => {
  test('hands the personal number over to the errand it was stored for, once', () => {
    storePendingCaller('KC-1', personNumber, storage, now);

    expect(takePendingCaller('KC-2', storage, now)).toBeNull();
    expect(takePendingCaller('KC-1', storage, now)).toBe(personNumber);
    expect(takePendingCaller('KC-1', storage, now)).toBeNull();
    expect(storage.length).toBe(0);
  });

  test('does not hand over an expired entry, and removes it', () => {
    storePendingCaller('KC-1', personNumber, storage, now);

    expect(takePendingCaller('KC-1', storage, now + twoMinutes)).toBeNull();
    expect(storage.length).toBe(0);
  });

  test('ignores unreadable entries', () => {
    storage.setItem('draken-ace-caller:KC-1', 'not json');

    expect(takePendingCaller('KC-1', storage, now)).toBeNull();
  });

  test('cleans up expired and unreadable entries but keeps valid ones and unrelated keys', () => {
    storePendingCaller('KC-old', personNumber, storage, now - twoMinutes);
    storePendingCaller('KC-new', personNumber, storage, now);
    storage.setItem('draken-ace-caller:KC-broken', '{');
    storage.setItem('unrelated', 'value');

    removeExpiredPendingCallers(storage, now);

    expect(storage.getItem('draken-ace-caller:KC-old')).toBeNull();
    expect(storage.getItem('draken-ace-caller:KC-broken')).toBeNull();
    expect(storage.getItem('unrelated')).toBe('value');
    expect(takePendingCaller('KC-new', storage, now)).toBe(personNumber);
  });

  test('does nothing without storage', () => {
    expect(() => storePendingCaller('KC-1', personNumber, null, now)).not.toThrow();
    expect(takePendingCaller('KC-1', null, now)).toBeNull();
  });
});
