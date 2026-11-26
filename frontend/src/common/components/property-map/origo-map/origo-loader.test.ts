import { describe, expect, it } from 'vitest';

import { remToPx } from './origo-loader';

describe('remToPx', () => {
  it('converts rem values to px for a 16px root', () => {
    expect(remToPx('.a { padding: 0.5rem 1rem; width: calc(1.5rem + 2px); margin: -.25rem; }')).toBe(
      '.a { padding: 8px 16px; width: calc(24px + 2px); margin: -4px; }'
    );
  });

  it('leaves other units and words containing "rem" alone', () => {
    expect(remToPx('.remove { width: 2em; height: 10px; } .x-1remainder {}')).toBe(
      '.remove { width: 2em; height: 10px; } .x-1remainder {}'
    );
  });
});
