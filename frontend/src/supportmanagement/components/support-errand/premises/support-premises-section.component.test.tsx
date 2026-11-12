// @vitest-environment jsdom
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import type { SupportInvestigationSection } from '@supportmanagement/services/support-investigation-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportPremisesSection } from './support-premises-section.component';

// Latest is 2.0; saved fixtures keep their own version.
vi.mock('@common/components/json/utils/schema-utils', () => ({
  getLatestRjsfSchema: vi.fn(async (municipalityId: string, name: string) => ({
    schemaId: `${municipalityId}_${name}_2.0`,
  })),
}));

vi.mock('@common/components/dynamic-text-editor', () => ({
  default: ({ value }: { value: { markup?: string } }) => <div data-cy="editor">{value.markup}</div>,
}));
vi.mock('@common/components/use-text-editor-placeholder', () => ({ useTextEditorPlaceholder: () => undefined }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { number?: string }) => (options?.number ? `${key}=${options.number}` : key),
  }),
}));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));

const getSupportStatements = vi.fn();
vi.mock('@supportmanagement/services/support-statement-service', () => ({
  getSupportStatements: (...args: unknown[]) => getSupportStatements(...args),
}));

const saveSupportInvestigationSection = vi.fn();
const saveSupportInvestigationSectionJsonParameter = vi.fn();
vi.mock('@supportmanagement/services/support-investigation-service', () => ({
  saveSupportInvestigationSection: (...args: unknown[]) => saveSupportInvestigationSection(...args),
  saveSupportInvestigationSectionJsonParameter: (...args: unknown[]) =>
    saveSupportInvestigationSectionJsonParameter(...args),
  SUPPORT_INVESTIGATION_TEXT_MAX_LENGTH: 8192,
}));

const PERMANENT_SERVING = 'aot_alcohol_serving_permit_application_permanent_serving';

const ANSWERS = {
  seating: { seatsIndoor: '50', seatsOutdoor: '10' },
  maxPersonsInPremises: { maxPersons: '50' },
};

const errandWith = (answers: Record<string, unknown> | undefined) => ({
  id: 'e1',
  status: 'ONGOING',
  labels: [
    { classification: 'CATEGORY', resourceName: 'ALCOHOL' },
    { classification: 'TYPE', resourceName: 'SERVING_PERMIT_APPLICATION_PERMANENT_SERVING' },
  ],
  jsonParameters: answers ? [{ key: PERMANENT_SERVING, value: answers, schemaId: `${PERMANENT_SERVING}-id` }] : [],
});

const saveRef: { current: (() => Promise<boolean>) | undefined } = { current: undefined };

const mountSection = (
  writable = true,
  section: SupportInvestigationSection = { id: 's1', sectionKey: 'premises', text: '' }
) =>
  render(
    <SupportPremisesSection
      section={section}
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
  saveSupportInvestigationSection.mockResolvedValue({ id: 'i1' });
  saveSupportInvestigationSectionJsonParameter.mockResolvedValue({ id: 'i1' });
  getSupportStatements.mockResolvedValue([]);
  useConfigStore.setState({ municipalityId: '2281' });
  useMetadataStore.setState({
    supportMetadata: {
      namespace: 'AOT',
      statementOutcomes: [{ name: 'APPROVED_WITH_CONDITIONS', displayName: 'Godkänd med villkor' }],
    } as never,
  });
  useSupportStore.setState({ supportErrand: errandWith(ANSWERS) as never });
});

afterEach(cleanup);

test('the capacity is read from the application, not asked of the handler', () => {
  mountSection();

  expect(fieldOf('premises-max-persons').textContent).toBe('50');
  expect(fieldOf('premises-seats').textContent).toBe(
    'common:premises.seats_indoor=50 / common:premises.seats_outdoor=10'
  );
});

test('an application without the answers says so instead of showing a blank', () => {
  useSupportStore.setState({ supportErrand: errandWith(undefined) as never });

  mountSection();

  expect(fieldOf('premises-max-persons').textContent).toBe('common:premises.not_answered');
  expect(fieldOf('premises-seats').textContent).toBe('common:premises.not_answered');
});

test('the fire safety is the rescue service answer, read back from the referral', async () => {
  getSupportStatements.mockResolvedValue([
    {
      counterpartyName: 'Medelpads Räddningstjänstförbund',
      outcome: 'APPROVED_WITH_CONDITIONS',
      respondedAt: '2026-04-10T00:00:00+02:00',
    },
  ]);

  mountSection();

  await waitFor(() =>
    expect(fieldOf('premises-fire-safety').textContent).toBe('Godkänd med villkor (Medelpads Räddningstjänstförbund)')
  );
});

test('no answer from the rescue service is said plainly', async () => {
  mountSection();

  await waitFor(() => expect(fieldOf('premises-fire-safety').textContent).toBe('common:premises.fire_safety_pending'));
});

const savedJson = () => saveSupportInvestigationSectionJsonParameter.mock.calls[0][5].value;

test('the inspection date and the right of disposal are saved in the JSON of the premises section', async () => {
  mountSection();

  fireEvent.change(fieldOf('premises-inspected-at'), { target: { value: '2026-04-10' } });
  fireEvent.change(fieldOf('premises-right-of-disposal'), { target: { value: 'PROVEN' } });

  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(saveSupportInvestigationSectionJsonParameter).toHaveBeenCalledWith(
    'e1',
    '2281',
    'i1',
    's1',
    'aot_investigation_premises_section',
    {
      schemaId: '2281_aot_investigation_premises_section_2.0',
      value: { inspectedAt: '2026-04-10', rightOfDisposal: { status: 'PROVEN' } },
    }
  );
  expect(saveSupportInvestigationSection).not.toHaveBeenCalled();
});

test('what the section holds is shown, and an edit keeps the other fields and the version it was saved with', async () => {
  mountSection(true, {
    id: 's1',
    sectionKey: 'premises',
    text: '',
    jsonParameters: [
      {
        key: 'aot_investigation_premises_section',
        schemaId: '2281_aot_investigation_premises_section_1.0',
        value: { inspectedAt: '2026-03-01', rightOfDisposal: { status: 'PENDING' } },
      },
    ],
  });

  expect(fieldOf('premises-inspected-at').value).toBe('2026-03-01');
  expect(fieldOf('premises-right-of-disposal').value).toBe('PENDING');

  fireEvent.change(fieldOf('premises-right-of-disposal'), { target: { value: 'PROVEN' } });
  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(savedJson()).toEqual({ inspectedAt: '2026-03-01', rightOfDisposal: { status: 'PROVEN' } });
  expect(saveSupportInvestigationSectionJsonParameter.mock.calls[0][5].schemaId).toBe(
    '2281_aot_investigation_premises_section_1.0'
  );
});

test('a space typed in the note survives the re-render', () => {
  const { rerender } = mountSection();
  const remount = () =>
    rerender(
      <SupportPremisesSection
        section={{ id: 's1', sectionKey: 'premises', text: '' }}
        investigationId="i1"
        writable={true}
        onEdited={vi.fn()}
        onSaved={vi.fn()}
        saveRef={saveRef}
      />
    );

  // A key at a time, each one appended to what the field shows, so a stored value that lost the space fails here.
  for (const key of ['h', 'y', 'r', 'a', ' ', 't']) {
    const field = fieldOf('premises-right-of-disposal-note');
    fireEvent.change(field, { target: { value: field.value + key } });
    remount();
  }

  expect(fieldOf('premises-right-of-disposal-note').value).toBe('hyra t');
});

test('the two controls sharing a form control keep an id each, and the label points at the select', () => {
  mountSection();

  const select = fieldOf('premises-right-of-disposal');
  const note = fieldOf('premises-right-of-disposal-note');

  expect(select.id).not.toBe(note.id);
  expect(document.querySelectorAll(`[id="${note.id}"]`).length).toBe(1);
  expect(document.querySelector(`label[for="${select.id}"]`)?.textContent).toBe(
    'common:premises.right_of_disposal.label'
  );
  expect(note.getAttribute('aria-label')).toBe('common:premises.right_of_disposal.note');
});

test('a passed step leaves nothing to change', () => {
  mountSection(false);

  expect(fieldOf('premises-inspected-at').disabled).toBe(true);
  expect(fieldOf('premises-right-of-disposal').disabled).toBe(true);
  expect(fieldOf('premises-right-of-disposal-note').disabled).toBe(true);
});

test('the serving areas are saved on the premises section', async () => {
  mountSection();

  fireEvent.change(fieldOf('premises-serving-area'), { target: { value: 'Matsalen och bryggan' } });
  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(savedJson()).toEqual({ servingArea: { description: 'Matsalen och bryggan' } });
});

test('a passed step leaves the new fields as they are', () => {
  mountSection(false);

  expect(fieldOf('premises-serving-area').disabled).toBe(true);
});
