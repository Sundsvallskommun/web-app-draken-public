// @vitest-environment jsdom
import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { emptyUser } from '@common/services/user-service';
import { useUserStore } from '@stores/user-store';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { MeasuresSnapshot } from './support-measure-service';
import { SupportMeasuresTab } from './support-measures-tab';

const mocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<MeasuresSnapshot>>(),
  update: vi.fn<(...args: unknown[]) => Promise<void>>(),
  followUp: vi.fn<(...args: unknown[]) => Promise<void>>(),
  dirty: vi.fn(),
  locked: false,
}));
vi.mock('@common/services/api-service', () => ({ apiService: {} }));
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  isSupportErrandLocked: () => mocks.locked,
}));
vi.mock('./support-measure-service', () => ({
  getSupportMeasures: mocks.read,
  updateSupportMeasure: mocks.update,
  followUpSupportMeasure: mocks.followUp,
  createSupportMeasure: vi.fn(),
  decideSupportMeasure: vi.fn(),
}));

const measure: Measure = {
  id: 'measure-one',
  version: 3,
  measureTypeId: 'type-one',
  type: 'EDUCATION',
  addedByUser: 'creator',
  addedByRole: 'MANAGER',
  accept: 'TRUE',
  description: 'Utbilda personalen',
  goal: 'Säkrare arbetssätt',
  plannedStart: '2026-09-10T00:00:00+02:00',
  plannedComplete: '2026-09-30T00:00:00+02:00',
  responsibleUser: 'Anna',
};
const snapshot: MeasuresSnapshot = {
  measures: [measure],
  errandVersion: 4,
  metadata: {
    measureTypes: [{ id: 'type-one', name: 'EDUCATION', displayName: 'Utbildning' }],
    roles: [{ name: 'MANAGER', displayName: 'Enhetschef' }],
  },
  creationRoles: [{ name: 'MANAGER', displayName: 'Enhetschef' }],
  registration: {
    status: 'ready',
    roleTypes: [{ roleName: 'MANAGER', measureTypeIds: ['type-one'], decides: true }],
  },
};
const errand = { id: 'errand-one', version: 4 } as SupportErrand;

function Harness({ active = true, followUp = true }: { active?: boolean; followUp?: boolean }) {
  const methods = useForm<SupportErrand>({ defaultValues: errand });
  return (
    <FormProvider {...methods}>
      <SupportMeasuresTab
        errand={errand}
        municipalityId="2281"
        onDirtyChange={mocks.dirty}
        isActive={active}
        followUp={followUp}
      />
    </FormProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locked = false;
  mocks.read.mockResolvedValue(snapshot);
  mocks.update.mockResolvedValue(undefined);
  mocks.followUp.mockResolvedValue(undefined);
  useUserStore.setState({
    user: {
      ...emptyUser,
      username: 'creator',
      permissions: { ...emptyUser.permissions, canEditSupportManagement: true },
    },
  });
});
afterEach(cleanup);

test('follow-up shows only planned approved measures and offers completion instead of editing', async () => {
  mocks.read.mockResolvedValue({
    ...snapshot,
    measures: [
      measure,
      { ...measure, id: 'partial', accept: 'REWORK', description: 'Delvis godkänd åtgärd' },
      { ...measure, id: 'proposal', accept: undefined, description: 'Ett nytt förslag' },
      { ...measure, id: 'rejected', accept: 'FALSE', description: 'Avslagen åtgärd' },
      { ...measure, id: 'unplanned', plannedStart: undefined, plannedComplete: undefined, description: 'Ej planerad' },
    ],
  });
  render(<Harness />);
  await screen.findByText('Utbilda personalen');
  expect(screen.getByRole('heading', { name: 'Uppföljning' })).toBeTruthy();
  expect(screen.getByText('Delvis godkänd åtgärd')).toBeTruthy();
  expect(screen.queryByText('Ett nytt förslag')).toBeNull();
  expect(screen.queryByText('Avslagen åtgärd')).toBeNull();
  expect(screen.queryByText('Ej planerad')).toBeNull();
  expect(screen.queryByRole('button', { name: /Lägg till|Bedöm förslag|Redigera/ })).toBeNull();
  expect(screen.getAllByRole('checkbox', { name: 'Utförd: Utbildning' })).toHaveLength(2);
  fireEvent.change(screen.getByRole('combobox', { name: 'Beslut' }), { target: { value: 'accepted' } });
  expect(screen.queryByText('Delvis godkänd åtgärd')).toBeNull();
});

test.each(['Ja', 'Nej'])(
  'completion requires both answers and saves %s without changing the original measure',
  async (answer) => {
    render(<Harness />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Utförd: Utbildning' }));
    const dialog = await screen.findByRole('dialog', { name: 'Följ upp åtgärd' });
    await waitFor(() => expect(mocks.dirty).toHaveBeenLastCalledWith(true));
    const save = within(dialog).getByRole('button', { name: 'Spara uppföljning' });
    fireEvent.click(save);
    await within(dialog).findByRole('alert');
    expect(mocks.followUp).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('radio', { name: answer }));
    fireEvent.click(save);
    expect(mocks.followUp).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Vad har hänt? (Obligatoriskt)' }), {
      target: { value: '  Personalen har fått utbildning.  ' },
    });
    const result = { desiredEffectAchieved: answer === 'Ja', followUpDescription: 'Personalen har fått utbildning.' };
    mocks.read.mockResolvedValue({
      ...snapshot,
      measures: [{ ...measure, followUp: { status: 'completed', ...result }, executed: '2026-09-11T12:00:00Z' }],
    });
    fireEvent.click(save);
    await waitFor(() => expect(mocks.followUp).toHaveBeenCalledWith('2281', 'errand-one', 'measure-one', 3, result));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    expect(await screen.findByText('Utförd')).toBeTruthy();
    expect(screen.getByText('Vad har hänt:')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  }
);

test('cancel leaves the measure incomplete and does not save', async () => {
  render(<Harness />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Utförd: Utbildning' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Avbryt' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(mocks.followUp).not.toHaveBeenCalled();
  expect(screen.getByRole('checkbox')).toBeTruthy();
  expect(mocks.dirty).toHaveBeenLastCalledWith(false);
});

test('reopens saved pending answers read-only and finishes execution', async () => {
  const answers = { desiredEffectAchieved: false, followUpDescription: 'Sparat före avbrottet' };
  mocks.read.mockResolvedValue({
    ...snapshot,
    measures: [{ ...measure, followUp: { status: 'pending', ...answers } }],
  });
  render(<Harness />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Utförd: Utbildning' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByDisplayValue(answers.followUpDescription).closest('fieldset')?.disabled).toBe(true);
  expect((within(dialog).getByRole('radio', { name: 'Nej' }) as HTMLInputElement).checked).toBe(true);
  mocks.read.mockResolvedValue({
    ...snapshot,
    measures: [{ ...measure, executed: '2026-09-11T12:00:00Z', followUp: { status: 'completed', ...answers } }],
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Slutför sparandet' }));
  await waitFor(() => expect(mocks.followUp).toHaveBeenCalledWith('2281', 'errand-one', 'measure-one', 3, answers));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByText('Utförd')).toBeTruthy();
});

test('a version conflict preserves answers and never replaces someone else’s recorded follow-up', async () => {
  mocks.followUp.mockRejectedValueOnce(
    new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 412,
      statusText: 'Precondition Failed',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    })
  );
  render(<Harness />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Utförd: Utbildning' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('radio', { name: 'Nej' }));
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Mina svar' } });
  mocks.read.mockResolvedValue({
    ...snapshot,
    measures: [
      {
        ...measure,
        version: 4,
        executed: '2026-09-11T12:00:00Z',
        followUp: { status: 'completed', desiredEffectAchieved: true, followUpDescription: 'Tidigare sparat svar' },
      },
    ],
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Spara uppföljning' }));
  await within(dialog).findByRole('alert');
  expect(within(dialog).getByDisplayValue('Mina svar')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Spara uppföljning' }));
  expect(mocks.followUp).toHaveBeenCalledTimes(1);
});

test.each(['other-owner', 'read-only', 'locked'])('follow-up respects %s editing restrictions', async (restriction) => {
  if (restriction === 'other-owner') {
    useUserStore.setState({ user: { ...useUserStore.getState().user, username: 'someone-else' } });
  } else if (restriction === 'read-only') {
    useUserStore.setState({ user: { ...useUserStore.getState().user, permissions: emptyUser.permissions } });
  } else mocks.locked = true;
  render(<Harness />);
  await screen.findByText('Utbilda personalen');
  expect(screen.queryByRole('button', { name: /Redigera åtgärd/ })).toBeNull();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('returning to a tab reloads measures changed in the other view', async () => {
  const view = render(<Harness active={false} />);
  expect(mocks.read).not.toHaveBeenCalled();
  view.rerender(<Harness />);
  await screen.findByText('Utbilda personalen');
  view.rerender(<Harness active={false} />);
  mocks.read.mockResolvedValue({ ...snapshot, measures: [{ ...measure, responsibleUser: 'Erik' }] });
  view.rerender(<Harness />);
  await screen.findByText('Erik');
  expect(mocks.read).toHaveBeenCalledTimes(2);
});

test('follow-up explains load failures and supports retry and empty results', async () => {
  mocks.read.mockRejectedValueOnce(new Error('Unavailable'));
  render(<Harness />);
  await screen.findByRole('alert');
  mocks.read.mockResolvedValue({ ...snapshot, measures: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
  await screen.findByText('Det finns inga planerade och godkända åtgärder att följa upp.');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('the original measures view retains registration and proposal decisions', async () => {
  mocks.read.mockResolvedValue({ ...snapshot, measures: [{ ...measure, accept: undefined }] });
  render(<Harness followUp={false} />);
  expect(await screen.findByRole('button', { name: 'Bedöm förslag Utbildning' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Lägg till åtgärd' })).toBeTruthy();
});
