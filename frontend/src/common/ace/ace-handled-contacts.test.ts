import { beforeEach, describe, expect, test } from 'vitest';

import { markContactHandled } from './ace-handled-contacts';

const now = 1_700_000_000_000;
const tenMinutes = 10 * 60 * 1000;

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

describe('markContactHandled', () => {
  test('accepts a contact once, also when asked again from another tab or after a reload', () => {
    expect(markContactHandled('4711', storage, now)).toBe(true);
    expect(markContactHandled('4711', storage, now + 1000)).toBe(false);
    expect(markContactHandled('4712', storage, now + 1000)).toBe(true);
  });

  test('accepts the contact again once ten minutes have passed, and drops expired entries', () => {
    markContactHandled('4711', storage, now);
    markContactHandled('4712', storage, now + tenMinutes - 1);

    expect(markContactHandled('4711', storage, now + tenMinutes)).toBe(true);
    expect(storage.getItem('draken-ace-contact:4712')).not.toBeNull();
  });

  test('ignores keys it does not own', () => {
    storage.setItem('unrelated', 'value');
    markContactHandled('4711', storage, now);

    expect(storage.getItem('unrelated')).toBe('value');
  });

  test('treats every contact as new without storage', () => {
    expect(markContactHandled('4711', null, now)).toBe(true);
    expect(markContactHandled('4711', null, now)).toBe(true);
  });
});
