// @vitest-environment jsdom
import { renderTemplatePdfDirect } from '@common/services/template-render-service';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { inspectionProtocolTemplate } from '@supportmanagement/inspection-protocols';
import { getSupportAttachments, saveSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import {
  getSupportInvestigation,
  saveSupportInvestigation,
  startSupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import {
  getSupportMeasures,
  saveSupportMeasures,
  unlinkSupportMeasureAttachment,
  uploadSupportMeasureAttachment,
} from '@supportmanagement/services/support-measure-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { InspectionProtocol } from './inspection-protocol.component';

const internal = inspectionProtocolTemplate('internal_inspection')!;

// Translates from the Swedish language file, so the test reads the texts the handler sees.
vi.mock('react-i18next', async () => {
  const sv = (await import('../../../../../../public/locales/sv/common.json')).default;
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
const showConfirmation = vi.fn();
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
  useConfirm: () => ({ showConfirmation }),
}));
vi.mock('@common/services/template-render-service', () => ({
  renderTemplatePdfDirect: vi.fn(),
  renderTemplatePdf: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-attachment-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportAttachments: vi.fn(),
  saveSupportAttachments: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-investigation-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportInvestigation: vi.fn(),
  startSupportInvestigation: vi.fn(),
  saveSupportInvestigation: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-measure-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportMeasures: vi.fn(),
  saveSupportMeasures: vi.fn(),
  uploadSupportMeasureAttachment: vi.fn(),
  unlinkSupportMeasureAttachment: vi.fn(),
}));

const ERRAND_ID = 'errand-1';
const nothing = { create: [], update: [], remove: [] };
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
const investigation = {
  id: 'inv-1',
  type: 'serving_permit',
  title: 'Serveringstillstånd – tillsyn',
  version: 3,
  parameters: [
    { key: 'visit', displayName: 'Besök i lokalen', values: ['closed'] },
    { key: 'guestCount', displayName: 'Antal gäster', values: ['80'] },
  ],
};

const mount = () => render(<InspectionProtocol writable={true} setHasContent={vi.fn()} />);
const state = () => useSupportStore.getState();
const saver = () => state().tabSavers.investigation;
const template = () => screen.getByLabelText('Protokollmall') as HTMLSelectElement;

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({
    supportErrand: {
      id: ERRAND_ID,
      errandNumber: 'AOT-26100063',
      status: 'ONGOING',
      customer: [{ organizationName: 'Exempel AB', organizationNumber: '556000-0000' }],
    } as never,
    tabSavers: {},
    unsavedTabs: {},
  });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useUserStore.setState({ user: { name: 'Anna Andersson', permissions: { canEditSupportManagement: true } } } as never);
  showConfirmation.mockResolvedValue(true);
  vi.mocked(renderTemplatePdfDirect).mockResolvedValue(window.btoa('%PDF-1.7'));
  vi.mocked(saveSupportAttachments).mockResolvedValue([]);
  vi.mocked(getSupportAttachments).mockResolvedValue([]);
  vi.mocked(getSupportMeasures).mockResolvedValue(measures);
  vi.mocked(getSupportInvestigation).mockResolvedValue(investigation);
  vi.mocked(saveSupportMeasures).mockResolvedValue(undefined);
  vi.mocked(startSupportInvestigation).mockResolvedValue({ ...investigation, id: 'inv-new' });
  vi.mocked(saveSupportInvestigation).mockResolvedValue(investigation);
  vi.mocked(unlinkSupportMeasureAttachment).mockResolvedValue(undefined);
});

afterEach(cleanup);

test('shows the saved template, its answers and a card per control point, and counts the assessed ones', async () => {
  mount();

  expect(await screen.findByText('Ålderskontroll')).toBeTruthy();
  expect(template().value).toBe('serving_permit');
  expect(screen.getByDisplayValue('Stängde 01:00')).toBeTruthy();
  expect((screen.getByLabelText('Stängt') as HTMLInputElement).checked).toBe(true);
  expect(screen.getByDisplayValue('80')).toBeTruthy();
  expect(screen.getByDisplayValue('Exempel AB')).toBeTruthy();
  expect(screen.getByText('1 av 2 bedömda - 0 brister')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Godkänt', pressed: true })).toBeTruthy();
  expect(state().unsavedTabs.investigation).toBeFalsy();
});

test('an errand with nothing saved asks for a template; picking one seeds its control points without asking', async () => {
  vi.mocked(getSupportMeasures).mockResolvedValue([]);
  vi.mocked(getSupportInvestigation).mockResolvedValue(undefined);
  mount();

  expect((await screen.findByLabelText('Protokollmall')) as HTMLSelectElement).toBeTruthy();
  expect(template().value).toBe('');
  expect(screen.getByText('Välj mall…')).toBeTruthy();
  expect(screen.queryByText('Belastningsregistret')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Skapa tillsynsprotokoll' })).toBeNull();
  expect(screen.queryByText(/bedömda/)).toBeNull();

  await act(async () => {
    fireEvent.change(template(), { target: { value: 'internal_inspection' } });
  });
  expect(showConfirmation).not.toHaveBeenCalled();
  expect(screen.getByText('Belastningsregistret')).toBeTruthy();
  expect(screen.getByText('0 av 5 bedömda - 0 brister')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Lägg till foto' })).toBeNull();
  expect(state().unsavedTabs.investigation).toBe(true);

  fireEvent.click(screen.getAllByRole('button', { name: 'Godkänt' })[1]);
  const written = internal.controlPoints.map((title, index) => ({
    id: `c${index}`,
    type: 'INTERNAL',
    title,
    result: index === 1 ? 'COMPLETED' : null,
    created: `2026-10-14T08:00:0${index}Z`,
  }));
  vi.mocked(getSupportMeasures).mockResolvedValue(written);
  vi.mocked(getSupportInvestigation).mockResolvedValue({ id: 'inv-new', type: 'internal_inspection', version: 1 });
  await act(async () => {
    expect(await saver()()).toBe(true);
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'INTERNAL', {
    create: [
      { title: 'Granskning via upplysningstjänsten Syna/Svensk faktakontroll' },
      { title: 'Belastningsregistret', result: 'COMPLETED' },
      { title: 'Skatteverket' },
      { title: 'Kronofogden' },
      { title: 'Annat' },
    ],
    update: [],
    remove: [],
  });
  expect(startSupportInvestigation).toHaveBeenCalledWith(ERRAND_ID, '2281', 'Inre tillsyn', [], {
    type: 'internal_inspection',
    parameters: expect.arrayContaining([
      { key: 'businessName', displayName: 'Verksamhetens namn', values: ['Exempel AB'] },
    ]),
  });
  expect(saveSupportInvestigation).not.toHaveBeenCalled();

  // After the save the page shows what was written: each point once, now saved, so photos can be added.
  expect(await screen.findAllByRole('button', { name: 'Lägg till foto' })).toHaveLength(5);
  expect(screen.getAllByText('Belastningsregistret')).toHaveLength(1);
  expect(screen.getByText('1 av 5 bedömda - 0 brister')).toBeTruthy();
  expect(state().unsavedTabs.investigation).toBe(false);
});

test('offers its save under the investigation tab, and takes it back when it closes', async () => {
  const { unmount } = mount();

  await waitFor(() => expect(saver()).toBeTypeOf('function'));
  unmount();
  expect(saver()).toBeUndefined();
});

test('a result marks the tab unsaved, and the save patches only the measures that were edited', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.click(screen.getAllByRole('button', { name: 'Brist' })[0]);
  fireEvent.change(screen.getAllByPlaceholderText('Notering om Ålderskontroll…')[0], {
    target: { value: 'Ingen legitimation begärdes' },
  });
  expect(state().unsavedTabs.investigation).toBe(true);
  expect(screen.getByText('2 av 2 bedömda - 1 brist')).toBeTruthy();

  await act(async () => {
    expect(await saver()()).toBe(true);
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'INTERNAL', {
    create: [],
    update: [{ id: 'm1', patch: { result: 'NOT_COMPLETED', description: 'Ingen legitimation begärdes' } }],
    remove: [],
  });
  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'EXTERNAL', nothing);
  expect(saveSupportInvestigation).not.toHaveBeenCalled();
});

test('the action points are listed in their own accordion and written as EXTERNAL measures by the same save', async () => {
  mount();

  expect(await screen.findByText('Skapa åtgärdspunkter')).toBeTruthy();
  expect(screen.getByDisplayValue('Sätt upp skylt om åldersgräns')).toBeTruthy();
  expect(screen.queryByText('Sätt upp skylt om åldersgräns')).toBeNull();

  // The accordion starts closed, so its controls are there but not exposed to assistive technology.
  fireEvent.click(screen.getByRole('button', { name: 'Lägg till åtgärdspunkt', hidden: true }));
  fireEvent.change(screen.getByLabelText('Åtgärdspunkt 2'), { target: { value: 'Byt ut prislistan' } });
  expect(state().unsavedTabs.investigation).toBe(true);

  await act(async () => {
    expect(await saver()()).toBe(true);
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'INTERNAL', nothing);
  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'EXTERNAL', {
    create: [{ title: 'Byt ut prislistan' }],
    update: [],
    remove: [],
  });
  expect(saveSupportInvestigation).not.toHaveBeenCalled();
});

test('a changed answer is saved on the investigation with the version that was read', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.click(screen.getByLabelText('Polis'));
  fireEvent.change(screen.getByLabelText('Antal gäster'), { target: { value: '120' } });
  expect(state().unsavedTabs.investigation).toBe(true);

  await act(async () => {
    expect(await saver()()).toBe(true);
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'INTERNAL', nothing);
  expect(saveSupportInvestigation).toHaveBeenCalledWith(ERRAND_ID, '2281', 'inv-1', {
    version: 3,
    type: 'serving_permit',
    title: 'Serveringstillstånd – tillsyn',
    parameters: expect.arrayContaining([
      { key: 'visit', displayName: 'Besök i lokalen', values: ['closed'] },
      { key: 'coordinatedWith', displayName: 'Samordnad tillsyn tillsammans med', values: ['police'] },
      { key: 'guestCount', displayName: 'Antal gäster', values: ['120'] },
    ]),
  });
});

test('another template is taken only after the handler confirms, and replaces control points and answers', async () => {
  showConfirmation.mockResolvedValueOnce(false);
  mount();
  await screen.findByText('Ålderskontroll');

  await act(async () => {
    fireEvent.change(template(), { target: { value: 'internal_inspection' } });
  });
  expect(showConfirmation).toHaveBeenCalledWith(
    'Byta protokollmall?',
    expect.stringContaining('ersätts'),
    'Byt mall',
    'Avbryt',
    'info',
    'info'
  );
  expect(template().value).toBe('serving_permit');
  expect(screen.getByText('Ålderskontroll')).toBeTruthy();

  await act(async () => {
    fireEvent.change(template(), { target: { value: 'internal_inspection' } });
  });
  expect(template().value).toBe('internal_inspection');
  expect(screen.queryByText('Ålderskontroll')).toBeNull();
  expect(screen.getByText('Belastningsregistret')).toBeTruthy();
  expect(screen.getByLabelText('Verksamhetens namn')).toBeTruthy();
  expect(screen.queryByLabelText('Antal gäster')).toBeNull();
  // The action points are not the template's; they stay.
  expect(screen.getByDisplayValue('Sätt upp skylt om åldersgräns')).toBeTruthy();
  expect(state().unsavedTabs.investigation).toBe(true);

  await act(async () => {
    expect(await saver()()).toBe(true);
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(
    ERRAND_ID,
    '2281',
    'INTERNAL',
    expect.objectContaining({ create: expect.arrayContaining([{ title: 'Kronofogden' }]), remove: ['m1', 'm2'] })
  );
  expect(saveSupportInvestigation).toHaveBeenCalledWith(
    ERRAND_ID,
    '2281',
    'inv-1',
    expect.objectContaining({ version: 3, type: 'internal_inspection', title: 'Inre tillsyn' })
  );
});

test('clicking the chosen result again clears it, which is written as null', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.click(screen.getByRole('button', { name: 'Godkänt', pressed: true }));
  expect(screen.getByText('0 av 2 bedömda - 0 brister')).toBeTruthy();

  await act(async () => {
    await saver()();
  });

  expect(saveSupportMeasures).toHaveBeenCalledWith(ERRAND_ID, '2281', 'INTERNAL', {
    create: [],
    update: [{ id: 'm2', patch: { result: null } }],
    remove: [],
  });
});

test('a failed save keeps what the handler wrote and answers false', async () => {
  vi.mocked(saveSupportMeasures).mockRejectedValueOnce(new Error('nope'));
  mount();
  await screen.findByText('Ålderskontroll');
  fireEvent.change(screen.getAllByPlaceholderText('Notering om Ålderskontroll…')[0], {
    target: { value: 'skrivet men osparat' },
  });

  await act(async () => {
    expect(await saver()()).toBe(false);
  });

  expect(screen.getByDisplayValue('skrivet men osparat')).toBeTruthy();
  expect(state().unsavedTabs.investigation).toBe(true);
  expect(getSupportMeasures).toHaveBeenCalledTimes(1);
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
  expect(state().unsavedTabs.investigation).toBeFalsy();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ta bort bar.jpg' }));
  });
  expect(unlinkSupportMeasureAttachment).toHaveBeenCalledWith(ERRAND_ID, '2281', 'm1', 'a1');
  expect(screen.queryByText('bar.jpg')).toBeNull();
});

test('is read only when the tab is not writable', async () => {
  render(<InspectionProtocol writable={false} setHasContent={vi.fn()} />);
  await screen.findByText('Ålderskontroll');

  expect(template().disabled).toBe(true);
  expect((screen.getAllByRole('button', { name: 'Brist' })[0] as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getAllByPlaceholderText('Notering om Ålderskontroll…')[0] as HTMLTextAreaElement).disabled).toBe(true);
  expect((screen.getByLabelText('Antal gäster') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText('Åtgärdspunkt 1') as HTMLInputElement).disabled).toBe(true);
});

test('the protocol is rendered from the saved answers and control points, and filed on the errand', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  expect(screen.getByDisplayValue('Anna Andersson, handläggare')).toBeTruthy();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Skapa tillsynsprotokoll' }));
  });

  expect(renderTemplatePdfDirect).toHaveBeenCalledTimes(1);
  const [html, parameters] = vi.mocked(renderTemplatePdfDirect).mock.calls[0];
  expect(html).toContain('{% for m in measures %}');
  expect(parameters).toMatchObject({
    caseNumber: 'AOT-26100063',
    permitHolderName: 'Exempel AB',
    visitClosed: 'true',
    visitInPremises: '',
    coordinatedPolice: '',
    guestCount: '80',
    inspector1NameAndTitle: 'Anna Andersson, handläggare',
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

test('the protocol cannot be generated while a result, a note, an answer or an action point is unsaved', async () => {
  mount();
  await screen.findByText('Ålderskontroll');

  fireEvent.change(screen.getByLabelText('Antal gäster'), { target: { value: '120' } });

  expect((screen.getByRole('button', { name: 'Skapa tillsynsprotokoll' }) as HTMLButtonElement).disabled).toBe(true);
});
