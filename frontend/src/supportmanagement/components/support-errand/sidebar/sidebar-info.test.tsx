// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useConfigStore } from '../../../../stores/config-store';
import { useSupportStore } from '../../../../stores/support-store';
import { useUserStore } from '../../../../stores/user-store';
import type { SupportErrand } from '../../../services/support-errand-service';
import { SidebarInfo } from './sidebar-info.component';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  read: vi.fn(),
  assign: vi.fn(),
  status: vi.fn(),
  phase: vi.fn(),
  facility: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@stores/index', async () => ({
  ...(await import('../../../../stores/config-store')),
  ...(await import('../../../../stores/support-store')),
  ...(await import('../../../../stores/user-store')),
  useMetadataStore: (select: (state: { supportMetadata: undefined; setSupportMetadata: () => void }) => unknown) =>
    select({ supportMetadata: undefined, setSupportMetadata: () => undefined }),
}));
vi.mock('@common/services/user-service', async (original) => ({
  ...(await original<typeof import('@common/services/user-service')>()),
  getAssignableHandlers: async () => ({ administrators: [], roles: [] }),
}));
vi.mock('@common/components/handler-select/handler-select-options.component', () => ({
  HandlerSelectOptions: () => <option>Välj handläggare</option>,
}));
vi.mock('@common/components/lucide-icon-map/lucide-icon-map.component', () => ({ default: {} }));
vi.mock('@common/services/helper-service', () => ({
  hasDirtyFields: (fields: object) => Object.keys(fields).length > 0,
  prettyTime: () => '',
}));
vi.mock('@sk-web-gui/react', async () => ({
  ...(await import('@sk-web-gui/button')),
  ...(await import('@sk-web-gui/forms')),
  ...(await import('@sk-web-gui/divider')),
  ...(await import('@sk-web-gui/label')),
  useSnackbar: () => mocks.toast,
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  Status: { NEW: 'NEW', ASSIGNED: 'ASSIGNED', SUSPENDED: 'SUSPENDED', SOLVED: 'SOLVED', REOPENED: 'REOPENED' },
  Resolution: {},
  getOngoingStatus: () => 'ONGOING',
  isSupportErrandLocked: () => false,
  supportErrandIsEmpty: () => false,
  validateAction: () => true,
  updateSupportErrand: mocks.save,
  getSupportErrandById: mocks.read,
  readSupportErrandWriteSnapshot: mocks.read,
  setSupportErrandAdmin: mocks.assign,
  setSupportErrandStatus: mocks.status,
  updateSupportErrandPhase: mocks.phase,
}));
vi.mock('@supportmanagement/services/support-metadata-service', () => ({
  getSupportMetadata: async () => ({ metadata: { phases: [] } }),
}));
vi.mock('@supportmanagement/services/support-facilities', () => ({ saveFacilityInfo: mocks.facility }));
vi.mock('./buttons/support-close-errand-button.component', () => ({ SupportCloseErrandButtonComponent: () => null }));
vi.mock('./buttons/support-forward-errand-button.component', () => ({
  SupportForwardErrandButtonComponent: () => null,
}));
vi.mock('./buttons/support-reopen-errand-button.component', () => ({ SupportReopenErrandButton: () => null }));
vi.mock('./buttons/support-resume-errand-button.component', () => ({ SupportResumeErrandButton: () => null }));
vi.mock('./buttons/support-suspend-errand-button.component', () => ({
  SupportSuspendErrandButtonComponent: () => null,
}));
vi.mock('@supportmanagement/components/ongoing-support-errands/components/support-status-label.component', () => ({
  SupportStatusLabelComponent: () => null,
}));

const loaded: SupportErrand = {
  id: 'one',
  version: 1,
  title: 'Loaded title',
  status: 'NEW',
  priority: 'MEDIUM',
  category: '',
  type: '',
  subType: '',
  customer: [],
  contacts: [],
};
function Harness({ facility = false }: { facility?: boolean }) {
  const form = useForm<SupportErrand & { admin: string }>({
    defaultValues: { ...loaded, admin: 'Välj handläggare' },
    mode: 'onChange',
  });
  return (
    <FormProvider {...form}>
      <input aria-label="Title" {...form.register('title')} />
      <output aria-label="Dirty">{String(form.formState.isDirty)}</output>
      <SidebarInfo unsavedFacility={facility} setUnsavedFacility={() => undefined} />
    </FormProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockReset().mockResolvedValue(undefined);
  mocks.facility.mockReset().mockResolvedValue(undefined);
  mocks.read.mockReset().mockResolvedValue({ errand: { ...loaded, title: 'Someone else changed this', version: 2 } });
  useSupportStore.setState({ supportErrand: { ...loaded } });
  useConfigStore.setState({ municipalityId: '2281' });
  useUserStore.setState({
    user: { ...useUserStore.getState().user, username: 'handler' },
    administrators: [],
    handlerRoles: [],
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test.each([409, 412])('a save conflict (%s) retains the dirty draft and its original version', async (status) => {
  mocks.save.mockRejectedValue({ response: { status } });
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My unsaved title' } });
  const save = screen.getByRole('button', { name: 'Spara ärende' });
  await waitFor(() => expect(save).toHaveProperty('disabled', false));
  fireEvent.click(save);
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' })));
  expect(screen.getByLabelText('Title')).toHaveProperty('value', 'My unsaved title');
  expect(screen.getByLabelText('Dirty').textContent).toBe('true');
  expect(useSupportStore.getState().supportErrand).toMatchObject({ title: 'Loaded title', version: 1 });
  expect(mocks.read).not.toHaveBeenCalled();
});

test('Starta handläggning stops when the prerequisite save fails', async () => {
  mocks.save.mockRejectedValue({ response: { status: 412 } });
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Starta handläggning' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' })));
  expect(mocks.assign).not.toHaveBeenCalled();
  expect(mocks.phase).not.toHaveBeenCalled();
  expect(mocks.status).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Title')).toHaveProperty('value', 'My draft');
});

test('a facility failure after the errand save preserves the draft and blocks Starta', async () => {
  mocks.facility.mockRejectedValue({ response: { status: 412 } });
  render(<Harness facility />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Starta handläggning' }));
  await waitFor(() => expect(mocks.facility).toHaveBeenCalled());
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' })));
  expect(screen.getByLabelText('Title')).toHaveProperty('value', 'My draft');
  expect(useSupportStore.getState().supportErrand?.version).toBe(1);
  expect(mocks.phase).not.toHaveBeenCalled();
  expect(mocks.status).not.toHaveBeenCalled();
});

test('only a fully confirmed save replaces the form baseline', async () => {
  mocks.read.mockResolvedValue({ errand: { ...loaded, title: 'My saved title', version: 2 } });
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My saved title' } });
  const save = screen.getByRole('button', { name: 'Spara ärende' });
  await waitFor(() => expect(save).toHaveProperty('disabled', false));
  fireEvent.click(save);
  await waitFor(() => expect(screen.getByLabelText('Dirty').textContent).toBe('false'));
  expect(useSupportStore.getState().supportErrand).toMatchObject({ title: 'My saved title', version: 2 });
});
