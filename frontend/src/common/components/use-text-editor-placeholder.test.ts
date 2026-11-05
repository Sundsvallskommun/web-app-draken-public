// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, expect, test } from 'vitest';

import { useTextEditorPlaceholder } from './use-text-editor-placeholder';

const PLACEHOLDER = 'Skriv din bedömning';

const hostWith = (editor: boolean): HTMLDivElement => {
  const host = document.createElement('div');
  if (editor) host.appendChild(Object.assign(document.createElement('div'), { className: 'ql-editor' }));
  document.body.appendChild(host);
  return host;
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

test('the placeholder is written on an editor that is already mounted', () => {
  const host = createRef<HTMLElement>() as { current: HTMLElement | null };
  host.current = hostWith(true);

  renderHook(() => useTextEditorPlaceholder(host, PLACEHOLDER));

  expect(host.current?.querySelector<HTMLElement>('.ql-editor')?.dataset.placeholder).toBe(PLACEHOLDER);
});

test('the placeholder waits for an editor that mounts later, since the editor is loaded dynamically', async () => {
  const host = createRef<HTMLElement>() as { current: HTMLElement | null };
  host.current = hostWith(false);

  renderHook(() => useTextEditorPlaceholder(host, PLACEHOLDER));
  expect(host.current?.querySelector('.ql-editor')).toBeNull();

  host.current?.appendChild(Object.assign(document.createElement('div'), { className: 'ql-editor' }));

  await waitFor(() =>
    expect(host.current?.querySelector<HTMLElement>('.ql-editor')?.dataset.placeholder).toBe(PLACEHOLDER)
  );
});

test('nothing is written when there is no host to write into', () => {
  const host = { current: null };

  expect(() => renderHook(() => useTextEditorPlaceholder(host, PLACEHOLDER))).not.toThrow();
});
