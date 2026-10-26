// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { CParameter } from 'src/data-contracts/backend/data-contracts';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

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

const form: { parameters: CParameter[] } = { parameters: [] };
const setValue = vi.fn((name: 'parameters', value: CParameter[]) => {
  form[name] = value;
});
vi.mock('react-hook-form', () => ({
  useFormContext: () => ({
    watch: (name: 'parameters') => form[name],
    getValues: (name: 'parameters') => form[name],
    setValue,
  }),
}));

const saveRef: { current: (() => Promise<boolean>) | undefined } = { current: undefined };

const mountSection = (writable = true) =>
  render(
    <SupportCommunicationSection
      section={{ id: 's1', sectionKey: 'communication', text: '' }}
      investigationId="i1"
      writable={writable}
      onEdited={vi.fn()}
      onSaved={vi.fn()}
      saveRef={saveRef}
    />
  );

const fieldOf = (name: string) => document.querySelector(`[data-cy="${name}"]`) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  form.parameters = [];
});

afterEach(cleanup);

test('the day the application was complete is written onto the errand, to be saved with it', () => {
  mountSection();

  fireEvent.change(fieldOf('application-complete-at'), { target: { value: '2026-04-10' } });

  expect(setValue).toHaveBeenCalledWith('parameters', expect.anything(), { shouldDirty: true });
  expect(form.parameters).toEqual([
    { key: 'APPLICATION_COMPLETE_AT', displayName: 'Ansökan komplett', values: ['2026-04-10'] },
  ]);
});

test('a day already on the errand is what the field shows', () => {
  form.parameters = [{ key: 'APPLICATION_COMPLETE_AT', values: ['2026-03-02'] }];

  mountSection();

  expect(fieldOf('application-complete-at').value).toBe('2026-03-02');
});

test('the examination is written in the editor the investigation already uses', () => {
  mountSection();

  expect(fieldOf('communication-text')).toBeTruthy();
});

test('a passed step leaves nothing to change', () => {
  mountSection(false);

  expect(fieldOf('application-complete-at').disabled).toBe(true);
});
