// @vitest-environment jsdom
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  getSupportKnowledgeTestPeople,
  saveSupportKnowledgeTest,
  type SupportKnowledgeTestPerson,
} from '@supportmanagement/services/support-knowledge-test-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportKnowledgeTestSection } from './support-knowledge-test-section.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('@supportmanagement/services/support-knowledge-test-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportKnowledgeTestPeople: vi.fn(),
  saveSupportKnowledgeTest: vi.fn(),
}));
vi.mock('../pbi/use-add-support-pbi-by-hand', () => ({ useAddSupportPbiByHand: () => vi.fn() }));
vi.mock('../pbi/use-remove-support-pbi', () => ({ useRemoveSupportPbi: () => vi.fn() }));

const ERRAND_ID = 'errand-1';
const EDWIN = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';
const MARIA = 'f4c7a1e2-5b38-4a90-8c2d-1e9f3b7a6c50';

const person = (partyId: string, name: string): SupportKnowledgeTestPerson => ({
  partyId,
  name,
  identityCode: '',
  roles: '',
  addedByHand: false,
  status: '',
  testedAt: '',
  comment: '',
});

const saveRef = createRef<(() => Promise<boolean>) | undefined>() as {
  current: (() => Promise<boolean>) | undefined;
};

const mountSection = () => render(<SupportKnowledgeTestSection writable={true} onEdited={vi.fn()} saveRef={saveRef} />);

const cardOf = (partyId: string, part: string) =>
  document.querySelector(`[data-cy="knowledge-test-${part}-${partyId}"]`) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  saveRef.current = undefined;
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never, pbiSignal: undefined });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  vi.mocked(getSupportKnowledgeTestPeople).mockResolvedValue([
    person(EDWIN, 'Edwin Molina'),
    person(MARIA, 'Maria Molina'),
  ]);
  vi.mocked(saveSupportKnowledgeTest).mockResolvedValue(undefined);
});

afterEach(cleanup);

test('only the person whose card was touched is written, and an untouched field is left out', async () => {
  mountSection();
  await waitFor(() => expect(cardOf(EDWIN, 'status')).toBeTruthy());

  fireEvent.change(cardOf(EDWIN, 'status'), { target: { value: 'APPROVED' } });
  fireEvent.change(cardOf(EDWIN, 'date'), { target: { value: '2026-10-02' } });

  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(saveSupportKnowledgeTest).toHaveBeenCalledTimes(1);
  expect(saveSupportKnowledgeTest).toHaveBeenCalledWith(ERRAND_ID, '2281', EDWIN, {
    status: 'APPROVED',
    testedAt: '2026-10-02',
    comment: undefined,
  });
});

test('nothing is written when no card was touched', async () => {
  mountSection();
  await waitFor(() => expect(cardOf(EDWIN, 'status')).toBeTruthy());

  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(saveSupportKnowledgeTest).not.toHaveBeenCalled();
});

test('a person added elsewhere arrives on the signal, and what was typed but not saved stays put', async () => {
  mountSection();
  await waitFor(() => expect(cardOf(EDWIN, 'status')).toBeTruthy());

  fireEvent.change(cardOf(EDWIN, 'comment'), { target: { value: 'Bokat till torsdag.' } });

  const SARA = 'c2d4e6f8-0a1b-4c3d-8e5f-6a7b8c9d0e1f';
  vi.mocked(getSupportKnowledgeTestPeople).mockResolvedValue([
    person(EDWIN, 'Edwin Molina'),
    person(MARIA, 'Maria Molina'),
    person(SARA, 'Sara Lind'),
  ]);
  useSupportStore.setState({ pbiSignal: { errandId: ERRAND_ID, at: Date.now() } } as never);

  await waitFor(() => expect(cardOf(SARA, 'status')).toBeTruthy());
  expect((cardOf(EDWIN, 'comment') as HTMLTextAreaElement).value).toBe('Bokat till torsdag.');
});

test('a failure to write leaves the section edited rather than claiming it was saved', async () => {
  vi.mocked(saveSupportKnowledgeTest).mockRejectedValue(new Error('upstream'));
  mountSection();
  await waitFor(() => expect(cardOf(MARIA, 'status')).toBeTruthy());

  fireEvent.change(cardOf(MARIA, 'status'), { target: { value: 'RETAKE' } });

  await expect(saveRef.current?.()).resolves.toBe(false);
});
