// @vitest-environment jsdom
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportAttachment } from '@supportmanagement/services/support-attachment-service';
import { getSupportInvestigation } from '@supportmanagement/services/support-investigation-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { MigratedInvestigation } from './migrated-investigation.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('@supportmanagement/services/support-investigation-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportInvestigation: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-attachment-service', () => ({ getSupportAttachment: vi.fn() }));

const ERRAND_ID = 'errand-1';

const migratedInvestigation = {
  id: 'investigation-1',
  status: 'COMPLETED',
  title: 'Tillsyn av serveringsstalle',
  startedAt: '2025-12-15T08:00:00Z',
  completedAt: '2026-09-23T08:00:00Z',
  summary: '<p>Sammanfattning ur det gamla systemet</p>',
  conclusion: '<p>Slutsatsen ur det gamla systemet</p>',
  sections: [
    {
      id: 'section-2',
      sectionKey: 'sp_okand_nyckel',
      heading: 'Rubrik som Draken inte kanner',
      sortOrder: 2,
      text: '<p>Text i en okand sektion</p>',
    },
    {
      id: 'section-1',
      sectionKey: 'sp_annan_nyckel',
      heading: 'Forsta rubriken',
      sortOrder: 1,
      text: '<p>Text i den forsta sektionen</p>',
    },
  ],
  attachments: [{ id: 'attachment-1', fileName: 'protokoll.pdf', mimeType: 'application/pdf' }],
};

const mount = () => render(<MigratedInvestigation setHasContent={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  vi.mocked(getSupportInvestigation).mockResolvedValue(migratedInvestigation as never);
  vi.mocked(getSupportAttachment).mockResolvedValue({ base64EncodedString: 'ZmlsZW4=' } as never);
});

afterEach(cleanup);

test('the investigation is read as it stands, with its summary and its conclusion', async () => {
  mount();

  expect(await screen.findByText('Sammanfattning ur det gamla systemet')).toBeTruthy();
  expect(screen.getByText('Slutsatsen ur det gamla systemet')).toBeTruthy();
  expect(screen.getByText('Tillsyn av serveringsstalle')).toBeTruthy();
});

test('every section is shown in its own order, whatever its key is called', async () => {
  mount();

  await screen.findByText('Text i den forsta sektionen');

  const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

  expect(headings).toEqual([
    'common:investigation.migrated.summary',
    'common:investigation.migrated.conclusion',
    'Forsta rubriken',
    'Rubrik som Draken inte kanner',
    'common:investigation.migrated.files',
  ]);
});

test('the tab is told that it holds something to read', async () => {
  const setHasContent = vi.fn();
  render(<MigratedInvestigation setHasContent={setHasContent} />);

  await waitFor(() => expect(setHasContent).toHaveBeenCalledWith(true));
});

test('an errand without an investigation leaves the tab empty', async () => {
  vi.mocked(getSupportInvestigation).mockResolvedValue(undefined as never);
  const setHasContent = vi.fn();
  render(<MigratedInvestigation setHasContent={setHasContent} />);

  expect(await screen.findByText('common:investigation.migrated.none')).toBeTruthy();
  expect(setHasContent).not.toHaveBeenCalledWith(true);
});

test('a linked file is fetched when it is opened', async () => {
  mount();

  fireEvent.click(await screen.findByText('protokoll.pdf'));

  await waitFor(() =>
    expect(getSupportAttachment).toHaveBeenCalledWith(ERRAND_ID, '2281', {
      id: 'attachment-1',
      fileName: 'protokoll.pdf',
      mimeType: 'application/pdf',
    })
  );
});

test('nothing in the view invites a change', async () => {
  mount();

  await screen.findByText('Sammanfattning ur det gamla systemet');

  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  expect(screen.queryByTestId('start-investigation')).toBeNull();
});
