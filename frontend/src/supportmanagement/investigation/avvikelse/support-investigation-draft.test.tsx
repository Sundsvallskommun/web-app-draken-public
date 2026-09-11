// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act, createElement, useCallback, useState } from 'react';
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
  useFormContext: () => ({ register: vi.fn(), resetField: vi.fn() }),
}));
vi.mock('@sk-web-gui/react', async () => ({
  ...(await import('@sk-web-gui/tabs')),
  ...(await import('@sk-web-gui/button')),
  ...(await import('@sk-web-gui/alert')),
  ...(await import('@sk-web-gui/spinner')),
  ...(await import('@sk-web-gui/label')),
}));
vi.mock('@common/components/json/schema/schema-form.component', () => ({
  default: ({
    formData,
    onChange,
    readonly,
    idPrefix,
  }: {
    formData: InvestigationFormData;
    onChange: (data: InvestigationFormData) => void;
    readonly: boolean;
    idPrefix: string;
  }) =>
    createElement('textarea', {
      'aria-label': idPrefix,
      value: String(formData.answer ?? ''),
      readOnly: readonly,
      onChange: (event: { target: { value: string } }) => onChange({ ...formData, answer: event.target.value }),
    }),
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
vi.mock('./investigation-form-data', () => ({
  getInvestigationRenderingSchema: (_name: string, schema: unknown) => schema,
  getInvestigationServerTimestamps: () => [],
  getHslRiskValue: () => undefined,
  investigationDefaultFormStateBehavior: {},
  investigationRequiredIndicator: ' (Obligatorisk)',
}));
vi.mock('./investigation-schema-debug-panel.component', () => ({
  investigationSchemaDebugIsVisible: () => false,
  InvestigationSchemaDebugPanel: () => null,
}));
vi.mock('./support-investigation-service', () => ({
  getSupportInvestigationDocument: mocks.read,
  isSupportInvestigationAccessDenied: () => false,
  isSupportInvestigationConflict: () => false,
  saveSupportInvestigationDocument: vi.fn(),
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
      registration: { mode: 'enabled' },
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
