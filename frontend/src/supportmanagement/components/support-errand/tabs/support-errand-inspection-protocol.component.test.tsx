// @vitest-environment jsdom
import { renderTemplatePdfDirect } from '@common/services/template-render-service';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportAttachments, saveSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import {
  getSupportMeasures,
  unlinkSupportMeasureAttachment,
  updateSupportMeasure,
  uploadSupportMeasureAttachment,
} from '@supportmanagement/services/support-measure-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportErrandInspectionProtocol } from './support-errand-inspection-protocol.component';

// Translates from the Swedish language file, so the test reads the texts the handler sees.
vi.mock('react-i18next', async () => {
  const sv = (await import('../../../../../public/locales/sv/common.json')).default;
  const lookup = (key: string) =>
    key
      .replace(/^common:/, '')
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);
  const t = (key: string, options?: Record<string, unknown>) => {
    const value =
      lookup(key) ?? (typeof options?.count === 'number' && lookup(`${key}_${options.count === 1 ? 'one' : 'other'}`));
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
vi.mock('@common/services/template-render-service', () => ({ renderTemplatePdfDirect: vi.fn() }));
vi.mock('@supportmanagement/services/support-attachment-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportAttachments: vi.fn(),
  saveSupportAttachments: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-measure-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportMeasures: vi.fn(),
  updateSupportMeasure: vi.fn(),
  uploadSupportMeasureAttachment: vi.fn(),
  unlinkSupportMeasureAttachment: vi.fn(),
}));

const ERRAND_ID = 'errand-1';
const measures = [
  { id: 'm1', type: 'INTERNAL', title: 'Ålderskontroll', attachments: [] },
  {
    id: 'm2',
    type: 'INTERNAL',
    title: 'Serveringstider följs',
    result: 'COMPLETED',
    description: 'Stängde 01:00',
    attachments: [],
  },
  { id: 'x1', type: 'EXTERNAL', title: 'Sätt upp skylt om åldersgräns', attachments: [] },
];

const mount = () => render(<SupportErrandInspectionProtocol writable={true} setHasContent={vi.fn()} />);
const state = () => useSupportStore.getState();
const saver = () => state().tabSavers.inspection_protocol;

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({
    supportErrand: {
      id: ERRAND_ID,
      errandNumber: 'AOT-26100063',
      status: 'ONGOING',
      modified: '2026-10-13T08:00:00Z',
      customer: [{ organizationName: 'Exempel AB', organizationNumber: '556000-0000' }],
      measures,
    } as never,
    tabSavers: {},
    unsavedTabs: {},
  });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useUserStore.setState({ user: { name: 'Anna Andersson', permissions: { canEditSupportManagement: true } } } as never);
  vi.mocked(renderTemplatePdfDirect).mockResolvedValue(window.btoa('%PDF-1.7'));
  vi.mocked(saveSupportAttachments).mockResolvedValue([]);
  vi.mocked(getSupportAttachments).mockResolvedValue([]);
  vi.mocked(getSupportMeasures).mockResolvedValue(measures);
  vi.mocked(updateSupportMeasure).mockImplementation(async (_e, _m, id, patch) => ({
    ...measures.find((measure) => measure.id === id),
    ...patch,
  }));
  vi.mocked(unlinkSupportMeasureAttachment).mockResolvedValue(undefined);
});

afterEach(cleanup);

test('shows a card per control point with its result and note, and counts the assessed ones', async () => {
  mount();

  expect(await screen.findByText('Ålderskontroll')).toBeTruthy();
  expect(screen.queryByText('Sätt upp skylt om åldersgräns')).toBeNull();
  expect(screen.getByDisplayValue('Stängde 01:00')).toBeTruthy();
  expect(screen.getByText('1 av 2 bedömda - 0 brister')).toBeTruthy();
  const [completed] = screen.getAllByRole('button', { name: 'Godkänt', pressed: true });
  expect(completed).toBeTruthy();
  expect(state().unsavedTabs.inspection_protocol).toBeFalsy();
});

test('the action points are listed in their own accordion, as EXTERNAL measures', async () => {
  mount();

  expect(await screen.findByText('Skapa åtgärdspunkter')).toBeTruthy();
  expect(screen.getByDisplayValue('Sätt upp skylt om åldersgräns')).toBeTruthy();
  await waitFor(() => expect(state().tabSavers.action_points).toBeTypeOf('function'));
});

test('offers its save to whoever saves the errand, and takes it back when it closes', async () => {
  const { unmount } = mount();

  await waitFor(() => expect(saver()).toBeTypeOf('function'));
  unmount();
  expect(saver()).toBeUndefined();
});

test('a result marks the tab unsaved, and the save writes only the measures that were edited', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.click(screen.getAllByRole('button', { name: 'Brist' })[0]);
  fireEvent.change(screen.getAllByPlaceholderText('Notering om Ålderskontroll…')[0], {
    target: { value: 'Ingen legitimation begärdes' },
  });
  expect(state().unsavedTabs.inspection_protocol).toBe(true);
  expect(screen.getByText('2 av 2 bedömda - 1 brist')).toBeTruthy();

  await act(async () => {
    expect(await saver()()).toBe(true);
  });

  expect(updateSupportMeasure).toHaveBeenCalledTimes(1);
  expect(updateSupportMeasure).toHaveBeenCalledWith(ERRAND_ID, '2281', 'm1', {
    result: 'NOT_COMPLETED',
    description: 'Ingen legitimation begärdes',
  });
});

test('clicking the chosen result again clears it, which is written as null', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.click(screen.getByRole('button', { name: 'Godkänt', pressed: true }));
  expect(screen.getByText('0 av 2 bedömda - 0 brister')).toBeTruthy();

  await act(async () => {
    await saver()();
  });

  expect(updateSupportMeasure).toHaveBeenCalledWith(ERRAND_ID, '2281', 'm2', {
    result: null,
    description: 'Stängde 01:00',
  });
});

test('a reload of the list keeps what the handler has written but not yet saved', async () => {
  mount();
  await screen.findByText('Ålderskontroll');
  fireEvent.change(screen.getAllByPlaceholderText('Notering om Ålderskontroll…')[0], {
    target: { value: 'skrivet men osparat' },
  });

  vi.mocked(getSupportMeasures).mockResolvedValue([{ ...measures[0], description: 'från någon annan' }, measures[1]]);
  await act(async () => {
    useSupportStore.setState({
      supportErrand: { id: ERRAND_ID, status: 'ONGOING', modified: '2026-10-13T09:00:00Z' } as never,
    });
  });

  await waitFor(() => expect(getSupportMeasures).toHaveBeenCalledTimes(2));
  expect(screen.getByDisplayValue('skrivet men osparat')).toBeTruthy();
});

test('an uploaded photo shows on the card as soon as the service answers', async () => {
  const photo = { id: 'a1', fileName: 'bar.jpg', mimeType: 'image/jpeg' };
  vi.mocked(uploadSupportMeasureAttachment).mockResolvedValue({ ...measures[0], attachments: [photo] });
  mount();
  await screen.findByText('Ålderskontroll');

  const file = new File(['x'], 'bar.jpg', { type: 'image/jpeg' });
  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  await act(async () => {
    fireEvent.change(inputs[0], { target: { files: [file] } });
  });

  expect(uploadSupportMeasureAttachment).toHaveBeenCalledWith(ERRAND_ID, '2281', 'm1', file);
  expect(await screen.findByText('bar.jpg')).toBeTruthy();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ta bort bar.jpg' }));
  });
  expect(unlinkSupportMeasureAttachment).toHaveBeenCalledWith(ERRAND_ID, '2281', 'm1', 'a1');
  expect(screen.queryByText('bar.jpg')).toBeNull();
});

test('says where the control points come from when the errand has none', async () => {
  vi.mocked(getSupportMeasures).mockResolvedValue([]);
  mount();

  expect(await screen.findByText(/Lägg till dem under Ärendeuppgifter/)).toBeTruthy();
});

test('is read only when the tab is not writable', async () => {
  render(<SupportErrandInspectionProtocol writable={false} setHasContent={vi.fn()} />);
  await screen.findByText('Ålderskontroll');

  expect((screen.getAllByRole('button', { name: 'Brist' })[0] as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getAllByPlaceholderText('Notering om Ålderskontroll…')[0] as HTMLTextAreaElement).disabled).toBe(true);
});

test('the protocol is rendered from the page fields and the control points, and filed on the errand', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  expect(screen.getByDisplayValue('Exempel AB')).toBeTruthy();
  expect(screen.getByDisplayValue('Anna Andersson, handläggare')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Stängt'));
  fireEvent.click(screen.getByLabelText('Polis'));
  fireEvent.change(screen.getByLabelText('Antal gäster'), { target: { value: '120' } });

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Skapa tillsynsprotokoll' }));
  });

  expect(renderTemplatePdfDirect).toHaveBeenCalledTimes(1);
  const [template, parameters] = vi.mocked(renderTemplatePdfDirect).mock.calls[0];
  expect(template).toContain('{% for m in measures %}');
  expect(parameters).toMatchObject({
    caseNumber: 'AOT-26100063',
    permitHolderName: 'Exempel AB',
    visitClosed: 'true',
    visitInPremises: '',
    coordinatedPolice: 'true',
    guestCount: '120',
    measures: [
      { title: 'Ålderskontroll', noRemark: '', remark: '' },
      { title: 'Serveringstider följs', noRemark: 'X', remark: '', comment: 'Stängde 01:00' },
    ],
  });
  const [, , attachments] = vi.mocked(saveSupportAttachments).mock.calls[0];
  expect((attachments[0].file as unknown as File[])[0].name).toMatch(
    /^Tillsynsprotokoll AOT-26100063 \d{4}-\d{2}-\d{2}\.pdf$/
  );
  expect(getSupportAttachments).toHaveBeenCalled();
});

test('the protocol cannot be generated while a result or note is unsaved', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.click(screen.getAllByRole('button', { name: 'Brist' })[0]);

  expect((screen.getByRole('button', { name: 'Skapa tillsynsprotokoll' }) as HTMLButtonElement).disabled).toBe(true);
});
