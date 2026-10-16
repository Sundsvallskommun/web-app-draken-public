// @vitest-environment jsdom
import type { InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { useConfigStore, useSupportStore } from '@stores/index';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { InvestigationSectionText } from './investigation-section-text.component';

vi.mock('@common/components/dynamic-text-editor', () => ({
  default: ({
    value,
    onChange,
    readOnly,
  }: {
    value: { markup?: string };
    onChange: (event: { target: { value: { markup?: string } } }) => void;
    readOnly: boolean;
  }) => (
    <textarea
      data-cy="editor"
      readOnly={readOnly}
      value={value.markup ?? ''}
      onChange={(event) => onChange({ target: { value: { markup: event.target.value } } })}
    />
  ),
}));
vi.mock('@common/components/use-text-editor-placeholder', () => ({ useTextEditorPlaceholder: () => undefined }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const toastMessage = vi.fn();
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => toastMessage,
}));

const saveSupportInvestigationSection = vi.fn();
vi.mock('@supportmanagement/services/support-investigation-service', () => ({
  saveSupportInvestigationSection: (...args: unknown[]) => saveSupportInvestigationSection(...args),
  SUPPORT_INVESTIGATION_TEXT_MAX_LENGTH: 8192,
}));

const onEdited = vi.fn();
const onSaved = vi.fn();
const saveRef: { current: (() => Promise<boolean>) | undefined } = { current: undefined };

const mount = (section: InvestigationSection, writable = true) =>
  render(
    <InvestigationSectionText
      section={section}
      investigationId="i1"
      writable={writable}
      onEdited={onEdited}
      onSaved={onSaved}
      saveRef={saveRef}
      name="premises"
      labelKey="common:premises.notes"
      placeholderKey="common:premises.notes_placeholder"
      saveFailedKey="common:premises.toast.save_failed"
    />
  );

const editor = () => document.querySelector('[data-cy="editor"]') as HTMLTextAreaElement;

const type = (markup: string) => fireEvent.change(editor(), { target: { value: markup } });

beforeEach(() => {
  vi.clearAllMocks();
  saveRef.current = undefined;
  saveSupportInvestigationSection.mockResolvedValue({ id: 'i1', version: 2 });
  useConfigStore.setState({ municipalityId: '2281' });
  useSupportStore.setState({ supportErrand: { id: 'e1', status: 'ONGOING' } as never });
});

afterEach(cleanup);

test('the editor is named after the section, so each one has its own hook for the tests', () => {
  mount({ id: 's1', sectionKey: 'premises', text: '' });

  expect(document.querySelector('[data-cy="premises-text"]')).toBeTruthy();
});

test('a change is reported as an edit, and the written text is reported as none', () => {
  mount({ id: 's1', sectionKey: 'premises', text: 'Inget att anmärka.' });

  expect(onEdited).toHaveBeenLastCalledWith(false);

  type('Inget att anmärka. Lokalen är avgränsad.');
  expect(onEdited).toHaveBeenLastCalledWith(true);

  type('Inget att anmärka.');
  expect(onEdited).toHaveBeenLastCalledWith(false);
});

test('saving patches the section and hands the investigation back to the tab', async () => {
  mount({ id: 's1', sectionKey: 'premises', text: '' });

  type('Lokalen är besiktigad.');

  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(saveSupportInvestigationSection).toHaveBeenCalledWith('e1', '2281', 'i1', 's1', {
    text: 'Lokalen är besiktigad.',
  });
  expect(onSaved).toHaveBeenCalledWith({ id: 'i1', version: 2 });
  await waitFor(() => expect(onEdited).toHaveBeenLastCalledWith(false));
});

test('an untouched section is not patched at all', async () => {
  mount({ id: 's1', sectionKey: 'premises', text: 'Inget att anmärka.' });

  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(saveSupportInvestigationSection).not.toHaveBeenCalled();
});

test('a failed save keeps the edit and says so, so the tab can stop', async () => {
  saveSupportInvestigationSection.mockRejectedValue(new Error('conflict'));
  mount({ id: 's1', sectionKey: 'premises', text: '' });

  type('Lokalen är besiktigad.');

  await expect(saveRef.current?.()).resolves.toBe(false);

  expect(toastMessage).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'common:premises.toast.save_failed', status: 'error' })
  );
  expect(editor().value).toBe('Lokalen är besiktigad.');
  expect(onEdited).toHaveBeenLastCalledWith(true);
});

test('a reread section replaces an untouched field but never an unsaved edit', () => {
  const { rerender } = mount({ id: 's1', sectionKey: 'premises', text: 'Första.' });
  const remount = (text: string) =>
    rerender(
      <InvestigationSectionText
        section={{ id: 's1', sectionKey: 'premises', text }}
        investigationId="i1"
        writable={true}
        onEdited={onEdited}
        onSaved={onSaved}
        saveRef={saveRef}
        name="premises"
        labelKey="common:premises.notes"
        placeholderKey="common:premises.notes_placeholder"
        saveFailedKey="common:premises.toast.save_failed"
      />
    );

  remount('Skriven av någon annan.');
  expect(editor().value).toBe('Skriven av någon annan.');

  type('Min egen text.');
  remount('Ytterligare en omläsning.');
  expect(editor().value).toBe('Min egen text.');
});

test('a passed step leaves the editor read only', () => {
  mount({ id: 's1', sectionKey: 'premises', text: '' }, false);

  expect(editor().readOnly).toBe(true);
});
