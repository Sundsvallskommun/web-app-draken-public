// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { SupportCommunicationSection } from './support-communication-section.component';

vi.mock('@common/components/dynamic-text-editor', () => ({
  default: ({ value }: { value: { markup?: string } }) => <div data-cy="editor">{value.markup}</div>,
}));
vi.mock('@common/components/use-text-editor-placeholder', () => ({ useTextEditorPlaceholder: () => undefined }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));

const saveRef: { current: (() => Promise<boolean>) | undefined } = { current: undefined };

const mountSection = () =>
  render(
    <SupportCommunicationSection
      section={{ id: 's1', sectionKey: 'communication', text: '' }}
      investigationId="i1"
      writable
      onEdited={vi.fn()}
      onSaved={vi.fn()}
      saveRef={saveRef}
    />
  );

const fieldOf = (name: string) => document.querySelector(`[data-cy="${name}"]`);

afterEach(cleanup);

test('the examination is written in the editor the investigation already uses', () => {
  mountSection();

  expect(fieldOf('communication-text')).toBeTruthy();
});
