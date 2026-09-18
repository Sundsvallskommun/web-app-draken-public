// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { act, createElement, Fragment, type ReactNode, useCallback, useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import WarnIfUnsavedChanges from '../../../common/utils/warnIfUnsavedChanges';
import { useConfigStore } from '../../../stores/config-store';
import { useSupportStore } from '../../../stores/support-store';
import { useUserStore } from '../../../stores/user-store';
import type { InvestigationAccessState } from '../investigation-access';
import { useInvestigationProfileStore } from '../investigation-profile-store';
import type { InvestigationFormData } from './investigation-document';
import { SupportErrandInvestigationTab } from './support-errand-investigation-tab';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  preview: vi.fn(),
  generate: vi.fn(),
  attachments: vi.fn(),
  completion: vi.fn<() => { field: string; reportsField: string } | undefined>(),
  refresh: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
vi.mock('@stores/index', async () => ({
  ...(await import('../../../stores/config-store')),
  ...(await import('../../../stores/support-store')),
  ...(await import('../../../stores/user-store')),
  useMetadataStore: (selector: (state: { supportMetadata: undefined }) => unknown) =>
    selector({ supportMetadata: undefined }),
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({ isSupportErrandLocked: () => false }));
vi.mock('react-hook-form', async (original) => ({
  ...(await original<typeof import('react-hook-form')>()),
  useFormContext: () => ({ register: vi.fn(), resetField: vi.fn(), getValues: () => 1 }),
}));
vi.mock('@sk-web-gui/react', async (importOriginal) => {
  const gui = await importOriginal<typeof import('@sk-web-gui/react')>();
  return {
    Tabs: gui.Tabs,
    Button: gui.Button,
    Alert: gui.Alert,
    Spinner: gui.Spinner,
    Label: gui.Label,
  };
});
vi.mock('@common/components/json/schema/schema-form.component', () => ({
  default: ({
    formData,
    onChange,
    readonly,
    idPrefix,
    externalFields,
    onSubmit,
  }: {
    formData: InvestigationFormData;
    onChange: (data: InvestigationFormData) => void;
    readonly: boolean;
    idPrefix: string;
    externalFields?: Readonly<Record<string, ReactNode>>;
    onSubmit: (data: InvestigationFormData) => void;
  }) =>
    createElement(
      Fragment,
      null,
      createElement('textarea', {
        'aria-label': idPrefix,
        value: String(formData.answer ?? ''),
        readOnly: readonly,
        onChange: (event: { target: { value: string } }) => onChange({ ...formData, answer: event.target.value }),
      }),
      createElement('button', { onClick: () => onSubmit(formData) }, 'Save document'),
      externalFields?.investigationReport
    ),
}));
vi.mock('@common/components/json/utils/schema-utils', () => ({
  getRjsfSchema: async () => ({ type: 'object' }),
  getLatestRjsfSchema: async () => ({ schema: { type: 'object' }, schemaId: 'schema' }),
  getUiSchemaForSchema: async () => ({}),
}));
vi.mock('./investigation-classification', () => ({
  isReportedMisconductErrand: () => false,
  getInvestigationDocumentApplicability: () => undefined,
  isInvestigationClassificationOwner: () => false,
  getInvestigationClassificationSchemaContract: () => undefined,
  getInvestigationClassificationUiSchema: () => ({}),
  getInvestigationLegalBaseRules: () => [],
  getInvestigationLegalBases: () => [],
  normalizeContextualInvestigationFormData: (
    _key: string,
    _name: string,
    _schema: unknown,
    data: InvestigationFormData
  ) => data,
}));
vi.mock('./investigation-form-data', async (original) => ({
  ...(await original<typeof import('./investigation-form-data')>()),
  getInvestigationRenderingSchema: (_name: string, schema: unknown) => schema,
  getInvestigationServerTimestamps: () => [],
  getInvestigationCompletion: mocks.completion,
  getInvestigationReports: () => [],
  getHslRiskValue: () => undefined,
  investigationDefaultFormStateBehavior: {},
  investigationRequiredIndicator: ' (Obligatorisk)',
}));
vi.mock('@supportmanagement/services/support-attachment-service', () => ({
  getSupportAttachments: mocks.attachments,
}));
vi.mock('./investigation-schema-debug-panel.component', () => ({
  investigationSchemaDebugIsVisible: () => false,
  InvestigationSchemaDebugPanel: () => null,
}));
vi.mock('./support-investigation-service', () => ({
  getSupportInvestigationDocument: mocks.read,
  isSupportInvestigationAccessDenied: () => false,
  isSupportInvestigationConflict: () => false,
  saveSupportInvestigationDocument: mocks.save,
  createSupportInvestigationReport: mocks.generate,
  previewSupportInvestigationReport: mocks.preview,
}));

const grants = (
  first: 'edit' | 'read' | 'hidden' = 'edit',
  second: 'edit' | 'read' | 'hidden' = 'edit'
): InvestigationAccessState => ({
  status: 'ready',
  access: {
    municipalityId: '2281',
    errandId: 'one',
    documents: new Map([
      ['first', first],
      ['second', second],
    ]),
  },
});

function Harness({ access }: { access: InvestigationAccessState }) {
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback((key: string, value: boolean) => {
    setDirty((current) => (current[key] === value ? current : { ...current, [key]: value }));
  }, []);
  return (
    <WarnIfUnsavedChanges showWarning={Object.values(dirty).some(Boolean)}>
      <SupportErrandInvestigationTab access={access} onDirtyChange={onDirtyChange} refreshAccess={mocks.refresh} />
    </WarnIfUnsavedChanges>
  );
}

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.completion.mockReset();
  mocks.preview.mockReset();
  mocks.generate.mockReset();
  mocks.attachments.mockReset().mockResolvedValue([]);
  mocks.save.mockReset();
  sessionStorage.clear();
  mocks.read.mockReset().mockImplementation(async (_municipality: string, _errand: string, key: string) => ({
    document: { key, schemaId: 'schema', value: { answer: `Saved ${key}` } },
    etag: '"1"',
  }));
  mocks.refresh.mockClear();
  useConfigStore.setState({ municipalityId: '2281' });
  useSupportStore.setState({
    supportErrand: { id: 'one', version: 1, category: '', type: '', subType: '', customer: [], contacts: [] },
  });
  useUserStore.setState({ user: { ...useUserStore.getState().user, username: 'handler' } });
  useInvestigationProfileStore.setState({
    status: 'ready',
    profile: {
      application: 'IAF',
      state: 'active',
      registration: { mode: 'enabled', form: false },
      documents: ['first', 'second'].map((key) => ({
        key,
        schemaName: key,
        tabLabel: key,
        ownerLabel: 'Owner',
        placement: 'investigation',
        appliesTo: 'all',
      })),
    },
  });
});
afterEach(cleanup);

test.each(['Skapa rapport', 'Förhandsgranska rapport'])('shows the report service error for %s', async (button) => {
  mocks.completion.mockReturnValue({ field: 'completed', reportsField: 'reports' });
  mocks.read.mockImplementation(async (_municipality: string, _errand: string, key: string) => ({
    document: { key, schemaId: 'schema', value: { answer: `Saved ${key}`, completed: 'yes' } },
    etag: '"1"',
  }));
  const message = 'Rapporttjänsten nekade applikationens åtkomst. Kontakta support.';
  const error = new AxiosError('Request failed with status code 502', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 502,
    statusText: 'Bad Gateway',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data: { message },
  });
  mocks.preview.mockRejectedValue(error);
  mocks.generate.mockRejectedValue(error);
  render(createElement(Harness, { access: grants() }));
  await screen.findByDisplayValue('Saved first');
  fireEvent.click(screen.getAllByRole('button', { name: button })[0]);
  expect(await screen.findByText(message)).toBeTruthy();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.queryByText('Request failed with status code 502')).toBeNull();
});

test('an access failure hides data, retains the draft and keeps the reload warning active', async () => {
  const { rerender } = render(createElement(Harness, { access: grants() }));
  await screen.findByDisplayValue('Saved first');
  fireEvent.change(screen.getByLabelText('first', { selector: 'textarea' }), { target: { value: 'Unsaved work' } });
  rerender(createElement(Harness, { access: { status: 'error' } }));
  expect(screen.queryByDisplayValue('Unsaved work')).toBeNull();
  expect(screen.getByText(/osparade ändringar i ett dokument/)).toBeTruthy();
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Kontrollera behörigheter igen' }));
  expect(mocks.refresh).toHaveBeenCalledOnce();
  rerender(createElement(Harness, { access: grants() }));
  expect(await screen.findByDisplayValue('Unsaved work')).toBeTruthy();
  expect(mocks.read).toHaveBeenCalledTimes(2);
});

test('removing an earlier document does not move or erase the next document draft', async () => {
  const { rerender } = render(createElement(Harness, { access: grants() }));
  await screen.findByDisplayValue('Saved second');
  fireEvent.change(screen.getByLabelText('second', { selector: 'textarea' }), { target: { value: 'Second draft' } });
  rerender(createElement(Harness, { access: grants('hidden', 'edit') }));
  expect(screen.queryByLabelText('first', { selector: 'textarea' })).toBeNull();
  expect(screen.getByDisplayValue('Second draft')).toBeTruthy();
  rerender(createElement(Harness, { access: grants('hidden', 'hidden') }));
  expect(screen.queryByDisplayValue('Second draft')).toBeNull();
  rerender(createElement(Harness, { access: grants('edit', 'read') }));
  expect(await screen.findByDisplayValue('Second draft')).toHaveProperty('readOnly', true);
});

test('initially hidden documents are not fetched', async () => {
  render(createElement(Harness, { access: grants('hidden', 'read') }));
  await screen.findByDisplayValue('Saved second');
  expect(mocks.read).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText('first', { selector: 'textarea' })).toBeNull();
});

test('a new user cannot inherit the previous user draft', async () => {
  const { rerender } = render(createElement(Harness, { access: grants() }));
  await screen.findByDisplayValue('Saved first');
  fireEvent.change(screen.getByLabelText('first', { selector: 'textarea' }), { target: { value: 'Private draft' } });
  rerender(createElement(Harness, { access: { status: 'denied' } }));
  act(() => useUserStore.setState({ user: { ...useUserStore.getState().user, username: 'another-handler' } }));
  await waitFor(() => expect(screen.queryByText(/osparade ändringar i ett dokument/)).toBeNull());
  rerender(createElement(Harness, { access: grants() }));
  expect(await screen.findByDisplayValue('Saved first')).toBeTruthy();
  expect(screen.queryByDisplayValue('Private draft')).toBeNull();
});

test.each([2, 3])('a report readback at version %s does not authorize stale parent fields', async (version) => {
  mocks.completion.mockReturnValue({ field: 'completed', reportsField: 'reports' });
  mocks.read.mockResolvedValue({
    document: { key: 'first', schemaId: 'schema', value: { answer: 'Saved first', completed: 'yes' } },
    etag: '"1"',
  });
  useSupportStore.setState((state) => ({ supportErrand: { ...state.supportErrand!, title: 'Old title' } }));
  mocks.generate.mockResolvedValue({
    document: { key: 'first', schemaId: 'schema', value: { answer: 'Saved first', completed: 'yes' } },
    etag: '"2"',
    parentErrandVersion: version,
    report: { fileName: 'report.pdf' },
  });
  render(createElement(Harness, { access: grants('edit', 'hidden') }));
  fireEvent.click(await screen.findByRole('button', { name: 'Skapa rapport' }));
  await screen.findByText(/Rapporten report.pdf har skapats/);
  expect(useSupportStore.getState().supportErrand).toMatchObject({ title: 'Old title', version: 1 });
});

test('a report retry retains its publication identity after a lost response', async () => {
  mocks.completion.mockReturnValue({ field: 'completed', reportsField: 'reports' });
  mocks.read.mockResolvedValue({
    document: { key: 'first', schemaId: 'schema', value: { answer: 'Saved first', completed: 'yes' } },
    etag: '"1"',
  });
  mocks.generate.mockRejectedValue(new Error('Lost response'));
  const view = render(createElement(Harness, { access: grants('edit', 'hidden') }));
  fireEvent.click(await screen.findByRole('button', { name: 'Skapa rapport' }));
  await screen.findByText('Lost response');
  const operationId = mocks.generate.mock.calls[0][3];
  view.unmount();
  render(createElement(Harness, { access: grants('edit', 'hidden') }));
  fireEvent.click(await screen.findByRole('button', { name: 'Skapa rapport' }));
  await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(2));
  expect(mocks.generate.mock.calls[1][3]).toBe(operationId);
  expect(operationId).toMatch(/^[a-f0-9-]{36}$/);
});

test.each([
  [2, 2],
  [3, 1],
])('a document save at parent version %s retains the safe form version %s', async (received, expected) => {
  mocks.save.mockResolvedValue({
    document: { key: 'first', schemaId: 'schema', value: { answer: 'New answer' } },
    etag: '"2"',
    parentErrandVersion: received,
  });
  useSupportStore.setState((state) => ({ supportErrand: { ...state.supportErrand!, title: 'Old title' } }));
  render(createElement(Harness, { access: grants('edit', 'hidden') }));
  fireEvent.change(await screen.findByLabelText('first', { selector: 'textarea' }), {
    target: { value: 'New answer' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save document' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByText('Osparade ändringar')).toBeNull());
  await waitFor(() =>
    expect(useSupportStore.getState().supportErrand).toMatchObject({ title: 'Old title', version: expected })
  );
});

test('a failed attachment refresh still reports the publication as successful', async () => {
  mocks.completion.mockReturnValue({ field: 'completed', reportsField: 'reports' });
  mocks.read.mockResolvedValue({
    document: { key: 'first', schemaId: 'schema', value: { answer: 'Saved first', completed: 'yes' } },
    etag: '"1"',
  });
  mocks.generate.mockResolvedValue({
    document: { key: 'first', schemaId: 'schema', value: { answer: 'Saved first', completed: 'yes' } },
    etag: '"2"',
    parentErrandVersion: 4,
    report: { fileName: 'report.pdf' },
  });
  mocks.attachments.mockRejectedValue(new Error('List unavailable'));
  render(createElement(Harness, { access: grants('edit', 'hidden') }));
  fireEvent.click(await screen.findByRole('button', { name: 'Skapa rapport' }));
  await screen.findByText(/Rapporten report.pdf har skapats, men bilagelistan kunde inte uppdateras/);
  expect(mocks.generate).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('List unavailable')).toBeNull();
});
