import { describe, expect, it } from 'vitest';

import { keepUnsavedEdits } from './use-unsaved-edits';

describe('keepUnsavedEdits', () => {
  it('takes the incoming value for a field the user has not touched', () => {
    const merged = keepUnsavedEdits({ summary: 'gammalt' }, { summary: 'gammalt' }, { summary: 'nytt' });

    expect(merged.summary).toBe('nytt');
  });

  it('keeps a field the user has started writing in', () => {
    const merged = keepUnsavedEdits({ summary: 'pågående text' }, { summary: '' }, { summary: '' });

    expect(merged.summary).toBe('pågående text');
  });

  it('keeps the edit even when the resource has changed underneath', () => {
    const merged = keepUnsavedEdits({ summary: 'min text' }, { summary: '' }, { summary: 'kollegans text' });

    expect(merged.summary).toBe('min text');
  });

  it('merges field by field', () => {
    const merged = keepUnsavedEdits(
      { summary: 'min text', conclusion: '' },
      { summary: '', conclusion: '' },
      { summary: 'kollegans text', conclusion: 'kollegans bedömning' }
    );

    expect(merged).toEqual({ summary: 'min text', conclusion: 'kollegans bedömning' });
  });
});
