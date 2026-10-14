// @vitest-environment jsdom
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportMeasures, saveSupportMeasures } from '@supportmanagement/services/support-measure-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportErrandMeasures } from './support-errand-measures.component';

// Translates from the Swedish language file, so the test reads the texts the handler sees.
vi.mock('react-i18next', async () => {
  const sv = (await import('../../../../../public/locales/sv/common.json')).default;
  const t = (key: string, options?: Record<string, unknown>) => {
    const value = key
      .replace(/^common:/, '')
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);
    return typeof value === 'string'
      ? value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ''))
      : value ?? key;
  };
  return { useTranslation: () => ({ t }) };
});
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('@supportmanagement/services/support-measure-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportMeasures: vi.fn(),
  saveSupportMeasures: vi.fn(),
}));

const ERRAND_ID = 'errand-1';
const saved = [
  { id: 'm1', type: 'INTERNAL', title: 'Ålderskontroll' },
  { id: 'x1', type: 'EXTERNAL', title: 'Sätt upp skylt om åldersgräns' },
];

const mount = (measureType: 'INTERNAL' | 'EXTERNAL' = 'INTERNAL') =>
  render(<SupportErrandMeasures measureType={measureType} />);
const savedState = () => useSupportStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({
    supportErrand: { id: ERRAND_ID, status: 'ONGOING', measures: saved } as never,
    tabSavers: {},
    unsavedTabs: {},
  });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
  vi.mocked(getSupportMeasures).mockResolvedValue(saved);
  vi.mocked(saveSupportMeasures).mockResolvedValue(undefined);
});

afterEach(cleanup);

test('shows the saved measures of its type as rows and offers its save to whoever saves the errand', async () => {
  const { unmount } = mount();

  expect(screen.getByDisplayValue('Ålderskontroll')).toBeTruthy();
  expect(screen.queryByDisplayValue('Sätt upp skylt om åldersgräns')).toBeNull();
  await waitFor(() => expect(savedState().tabSavers.measures).toBeTypeOf('function'));
  expect(savedState().unsavedTabs.measures).toBeFalsy();

  unmount();
  expect(savedState().tabSavers.measures).toBeUndefined();
});

test('a template replaces the list, which marks the tab unsaved', () => {
  mount();

  fireEvent.change(screen.getByLabelText('Välj protokollmall'), { target: { value: 'tobacco_sales' } });

  expect(screen.queryByDisplayValue('Ålderskontroll')).toBeNull();
  expect(screen.getByDisplayValue('Egenkontrollprogram finns och följs')).toBeTruthy();
  expect(screen.getByText('Kontrollpunkter (6)')).toBeTruthy();
  expect(savedState().unsavedTabs.measures).toBe(true);
});

test('the save writes the difference: new rows created, edited rows updated, removed rows deleted', async () => {
  mount();
  await waitFor(() => expect(savedState().tabSavers.measures).toBeTypeOf('function'));

  fireEvent.change(screen.getByLabelText('Kontrollpunkt 1'), { target: { value: 'Ålderskontroll (18 år)' } });
  fireEvent.click(screen.getByText('Lägg till kontrollpunkt'));
  fireEvent.change(screen.getByLabelText('Kontrollpunkt 2'), { target: { value: 'Prislista' } });

  await act(async () => {
    expect(await savedState().tabSavers.measures()).toBe(true);
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'INTERNAL', {
    create: ['Prislista'],
    update: [{ id: 'm1', title: 'Ålderskontroll (18 år)' }],
    remove: [],
  });
});

test('after a save the list is what the service holds, so saving again writes nothing', async () => {
  vi.mocked(getSupportMeasures).mockResolvedValue([{ id: 'm2', type: 'INTERNAL', title: 'Prislista' }]);
  mount();
  await waitFor(() => expect(savedState().tabSavers.measures).toBeTypeOf('function'));

  fireEvent.click(screen.getByLabelText('Ta bort kontrollpunkt 1'));
  fireEvent.click(screen.getByText('Lägg till kontrollpunkt'));
  fireEvent.change(screen.getByLabelText('Kontrollpunkt 1'), { target: { value: 'Prislista' } });

  await act(async () => {
    await savedState().tabSavers.measures();
  });
  expect(vi.mocked(saveSupportMeasures).mock.calls[0][3]).toMatchObject({ create: ['Prislista'], remove: ['m1'] });
  expect(savedState().unsavedTabs.measures).toBe(false);

  await act(async () => {
    await savedState().tabSavers.measures();
  });
  expect(vi.mocked(saveSupportMeasures).mock.calls[1][3]).toEqual({ create: [], update: [], remove: [] });
});

test('a failed save keeps the edits and answers false', async () => {
  vi.mocked(saveSupportMeasures).mockRejectedValue(new Error('500'));
  mount();
  await waitFor(() => expect(savedState().tabSavers.measures).toBeTypeOf('function'));

  fireEvent.click(screen.getByText('Lägg till kontrollpunkt'));
  fireEvent.change(screen.getByLabelText('Kontrollpunkt 2'), { target: { value: 'Prislista' } });

  await act(async () => {
    expect(await savedState().tabSavers.measures()).toBe(false);
  });

  expect(screen.getByDisplayValue('Prislista')).toBeTruthy();
  expect(savedState().unsavedTabs.measures).toBe(true);
});

test('the action points are their own list: EXTERNAL rows, own texts, own tab saver, no template', async () => {
  mount('EXTERNAL');

  expect(screen.getByDisplayValue('Sätt upp skylt om åldersgräns')).toBeTruthy();
  expect(screen.queryByDisplayValue('Ålderskontroll')).toBeNull();
  expect(screen.queryByLabelText('Välj protokollmall')).toBeNull();
  expect(screen.getByText('Åtgärdspunkter (1)')).toBeTruthy();
  await waitFor(() => expect(savedState().tabSavers.action_points).toBeTypeOf('function'));

  fireEvent.click(screen.getByText('Lägg till åtgärdspunkt'));
  fireEvent.change(screen.getByLabelText('Åtgärdspunkt 2'), { target: { value: 'Ta ner affischen' } });
  expect(savedState().unsavedTabs.action_points).toBe(true);
  expect(savedState().unsavedTabs.measures).toBeFalsy();

  await act(async () => {
    await savedState().tabSavers.action_points();
  });
  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'EXTERNAL', {
    create: ['Ta ner affischen'],
    update: [],
    remove: [],
  });
});

test('without edit permission the list is read only', () => {
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: false } } } as never);
  mount();

  expect((screen.getByLabelText('Kontrollpunkt 1') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByText('Lägg till kontrollpunkt').closest('button') as HTMLButtonElement).disabled).toBe(true);
});
