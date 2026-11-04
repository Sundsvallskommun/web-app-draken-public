// @vitest-environment jsdom
import { renderTemplateHtml } from '@common/services/template-render-service';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  completeSupportInvestigationSections,
  getSupportInvestigation,
  saveSupportInvestigation,
  saveSupportInvestigationSection,
} from '@supportmanagement/services/support-investigation-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportErrandInvestigationTab } from './support-errand-investigation-tab';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('@supportmanagement/services/support-investigation-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportInvestigation: vi.fn(),
  saveSupportInvestigation: vi.fn(),
  startSupportInvestigation: vi.fn(),
  completeSupportInvestigationSections: vi.fn(),
  saveSupportInvestigationSection: vi.fn(),
}));
vi.mock('@common/services/template-render-service', () => ({ renderTemplateHtml: vi.fn() }));
const sectionStub = vi.hoisted(() => ({
  handsBack: null as object | null,
  saved: [] as string[],
  notes: {} as Record<string, (edited: boolean) => void>,
}));

vi.mock('./investigation-disclosure.component', () => ({
  SectionDisclosure: ({
    section,
    onEdited,
    onSaved,
    saveRef,
  }: {
    section: { sectionKey: string };
    onEdited: (sectionKey: string, edited: boolean) => void;
    onSaved: (investigation: object) => void;
    saveRef: { current?: () => Promise<boolean> };
  }) => {
    sectionStub.notes[section.sectionKey] = (edited: boolean) => onEdited(section.sectionKey, edited);
    saveRef.current = async () => {
      sectionStub.saved.push(section.sectionKey);
      if (sectionStub.handsBack) onSaved(sectionStub.handsBack);
      return true;
    };
    return null;
  },
}));
vi.mock('./migrated-investigation.component', () => ({
  MigratedInvestigation: () => <div data-testid="migrated-investigation" />,
}));
vi.mock('./inspection-protocol.component', () => ({
  InspectionProtocol: () => <div data-testid="inspection-protocol" />,
}));
vi.mock('./investigation-conclusion-disclosure.component', () => ({
  InvestigationConclusionDisclosure: ({
    values,
    set,
  }: {
    values: { proposal: string; conclusion: string };
    set: (key: string, value: string) => void;
  }) => (
    <>
      <textarea
        data-testid="proposal"
        value={values.proposal}
        onChange={(e) => set('proposal', e.currentTarget.value)}
      />
      <textarea
        data-testid="conclusion"
        value={values.conclusion}
        onChange={(e) => set('conclusion', e.currentTarget.value)}
      />
    </>
  ),
}));

const ERRAND_ID = 'errand-1';

const investigation = {
  id: 'investigation-1',
  version: 3,
  status: 'ACTIVE',
  summary: 'ursprungligt forslag',
  conclusion: 'ursprunglig text',
  recommendation: '',
  recommendationMotivation: '',
  sections: [{ id: 'section-1', sectionKey: 'financial_suitability', heading: 'Ekonomisk lämplighet', sortOrder: 3 }],
};

const setUnsaved = vi.fn();

const mountTab = () =>
  render(
    <SupportErrandInvestigationTab setUnsaved={setUnsaved} setHasContent={vi.fn()} inStep={true} writable={true} />
  );

beforeEach(() => {
  vi.clearAllMocks();
  sectionStub.saved = [];
  sectionStub.notes = {};
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never, tabSavers: {} });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useMetadataStore.setState({ supportMetadata: { decisionOutcomes: [] } } as never);
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
  sectionStub.handsBack = null;
  vi.mocked(getSupportInvestigation).mockResolvedValue(investigation as never);
  vi.mocked(saveSupportInvestigation).mockResolvedValue({ ...investigation, version: 4 } as never);
  vi.mocked(completeSupportInvestigationSections).mockResolvedValue(investigation as never);
  vi.mocked(saveSupportInvestigationSection).mockResolvedValue(investigation as never);
  vi.mocked(renderTemplateHtml).mockResolvedValue('<h3>Alkohollag (2010:1622)</h3>');
});

afterEach(cleanup);

test('an investigation that lacks an examination is completed with it, once, and with nothing it already has', async () => {
  mountTab();

  await waitFor(() => expect(completeSupportInvestigationSections).toHaveBeenCalledTimes(1));

  expect(completeSupportInvestigationSections).toHaveBeenCalledWith(ERRAND_ID, '2281', 'investigation-1', [
    { sectionKey: 'statements', heading: 'common:investigation.sections.statements', sortOrder: 1 },
    { sectionKey: 'ownership', heading: 'common:investigation.sections.ownership', sortOrder: 2 },
    { sectionKey: 'persons_of_influence', heading: 'common:investigation.sections.persons_of_influence', sortOrder: 3 },
    { sectionKey: 'premises', heading: 'common:investigation.sections.premises', sortOrder: 5 },
    { sectionKey: 'lease', heading: 'common:investigation.sections.lease', sortOrder: 6 },
    { sectionKey: 'fire_safety', heading: 'common:investigation.sections.fire_safety', sortOrder: 7 },
    { sectionKey: 'food_and_beverages', heading: 'common:investigation.sections.food_and_beverages', sortOrder: 8 },
    { sectionKey: 'staffing', heading: 'common:investigation.sections.staffing', sortOrder: 9 },
    { sectionKey: 'communication', heading: 'common:investigation.sections.communication', sortOrder: 10 },
    { sectionKey: 'child_perspective', heading: 'common:investigation.sections.child_perspective', sortOrder: 11 },
    { sectionKey: 'marketing', heading: 'common:investigation.sections.marketing', sortOrder: 12 },
    { sectionKey: 'legal_basis', heading: 'common:investigation.sections.legal_basis', sortOrder: 13 },
  ]);
});

const tobaccoErrand = {
  id: ERRAND_ID,
  labels: [
    { classification: 'CATEGORY', resourceName: 'TOBACCO' },
    { classification: 'TYPE', resourceName: 'SALES_PERMIT_APPLICATION' },
  ],
};

test('a tobacco permit is completed with the examinations its own type asks for', async () => {
  useSupportStore.setState({ supportErrand: tobaccoErrand as never, tabSavers: {} });
  mountTab();

  await waitFor(() => expect(completeSupportInvestigationSections).toHaveBeenCalledTimes(1));

  const asked = vi.mocked(completeSupportInvestigationSections).mock.calls[0][3];
  expect(asked.map((section) => section.sectionKey)).toEqual([
    'statements',
    'ownership',
    'persons_of_influence',
    'sales_point',
    'lease',
    'self_monitoring',
    'communication',
    'legal_basis',
  ]);
  expect(asked.map((section) => section.sortOrder)).toEqual([1, 2, 3, 5, 6, 7, 8, 9]);
});

test('both errand types are offered the underlay their own template renders', async () => {
  useSupportStore.setState({ supportErrand: tobaccoErrand as never, tabSavers: {} });
  const { unmount } = mountTab();

  await waitFor(() => expect(document.querySelector('[data-cy="investigation-basis"]')).toBeTruthy());
  unmount();

  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never, tabSavers: {} });
  mountTab();

  await waitFor(() => expect(document.querySelector('[data-cy="investigation-basis"]')).toBeTruthy());
});

test('a concluded investigation is left as it stands, however many examinations it lacks', async () => {
  vi.mocked(getSupportInvestigation).mockResolvedValue({ ...investigation, status: 'COMPLETED' } as never);
  mountTab();

  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  expect(completeSupportInvestigationSections).not.toHaveBeenCalled();
});

test('a tab that is only read is not written to either', async () => {
  render(
    <SupportErrandInvestigationTab setUnsaved={vi.fn()} setHasContent={vi.fn()} inStep={false} writable={false} />
  );

  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  expect(completeSupportInvestigationSections).not.toHaveBeenCalled();
});

test('the tab offers its save to whoever saves the errand, and takes it back when it closes', async () => {
  const { unmount } = mountTab();

  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  unmount();
  expect(useSupportStore.getState().tabSavers.investigation).toBeUndefined();
});

test('the registered save is handed over once, however much is written', async () => {
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  const offered = useSupportStore.getState().tabSavers.investigation;
  const field = await screen.findByTestId('conclusion');
  fireEvent.change(field, { target: { value: 'ett' } });
  fireEvent.change(field, { target: { value: 'ett ord till' } });

  expect(useSupportStore.getState().tabSavers.investigation).toBe(offered);
});

test('the save that was handed over writes what the field holds now, not what it held then', async () => {
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  const saveFromMount = useSupportStore.getState().tabSavers.investigation;
  const field = await screen.findByTestId('conclusion');
  fireEvent.change(field, { target: { value: 'det handlaggaren skrev sist' } });

  await saveFromMount();

  expect(saveSupportInvestigation).toHaveBeenCalledTimes(1);
  expect(vi.mocked(saveSupportInvestigation).mock.calls[0][3]).toMatchObject({
    conclusion: 'det handlaggaren skrev sist',
    version: 3,
  });
});

test('the proposal is read from and written back to the summary, which is the field it travels in', async () => {
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  const field = (await screen.findByTestId('proposal')) as HTMLTextAreaElement;
  expect(field.value).toBe('ursprungligt forslag');

  fireEvent.change(field, { target: { value: '<ol><li>bevilja ansokan</li></ol>' } });
  await useSupportStore.getState().tabSavers.investigation();

  expect(vi.mocked(saveSupportInvestigation).mock.calls[0][3]).toMatchObject({
    summary: '<ol><li>bevilja ansokan</li></ol>',
  });
});

test('a section saved first raises the version this save must write with', async () => {
  sectionStub.handsBack = { ...investigation, version: 9 };
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  const field = await screen.findByTestId('conclusion');
  fireEvent.change(field, { target: { value: 'nagot nytt' } });

  await useSupportStore.getState().tabSavers.investigation();

  expect(vi.mocked(saveSupportInvestigation).mock.calls[0][3]).toMatchObject({ version: 9 });
});

test('the investigation is left alone when only one of its sections was written', async () => {
  sectionStub.handsBack = { ...investigation, version: 9 };
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  await expect(useSupportStore.getState().tabSavers.investigation()).resolves.toBe(true);

  expect(saveSupportInvestigation).not.toHaveBeenCalled();
});

test('every section is handed a save of its own, and all of them run when the tab saves', async () => {
  const twoSections = {
    ...investigation,
    sections: [
      { id: 'section-1', sectionKey: 'financial_suitability', heading: 'Ekonomisk lämplighet', sortOrder: 3 },
      { id: 'section-2', sectionKey: 'premises', heading: 'Lokal och serveringsställe', sortOrder: 4 },
    ],
  };
  vi.mocked(getSupportInvestigation).mockResolvedValue(twoSections as never);
  vi.mocked(completeSupportInvestigationSections).mockResolvedValue(twoSections as never);
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  await useSupportStore.getState().tabSavers.investigation();

  expect(sectionStub.saved).toEqual(['financial_suitability', 'premises']);
});

test('a section that has something unsaved makes the whole tab unsaved', async () => {
  mountTab();
  await waitFor(() => expect(sectionStub.notes.financial_suitability).toBeTypeOf('function'));

  act(() => sectionStub.notes.financial_suitability(true));
  expect(setUnsaved).toHaveBeenLastCalledWith(true);

  act(() => sectionStub.notes.financial_suitability(false));
  expect(setUnsaved).toHaveBeenLastCalledWith(false);
});

test('an inspection errand gets the protocol instead of the investigation', async () => {
  useSupportStore.setState({
    supportErrand: { id: ERRAND_ID, labels: [{ classification: 'CATEGORY', resourceName: 'INSPECTION' }] } as never,
  });
  mountTab();

  expect(await screen.findByTestId('inspection-protocol')).toBeTruthy();
  expect(getSupportInvestigation).not.toHaveBeenCalled();
});

const withLegalBasis = (text?: string) => ({
  ...investigation,
  sections: [
    ...investigation.sections,
    { id: 'section-legal', sectionKey: 'legal_basis', heading: 'Lagrum', sortOrder: 13, text },
  ],
});

test('the laws are written into Lagrum from the template that holds them', async () => {
  vi.mocked(getSupportInvestigation).mockResolvedValue(withLegalBasis() as never);
  mountTab();

  await waitFor(() => expect(saveSupportInvestigationSection).toHaveBeenCalledTimes(1));

  expect(renderTemplateHtml).toHaveBeenCalledWith('serving-permit-legal-basis');
  expect(vi.mocked(saveSupportInvestigationSection).mock.calls[0][4]).toEqual({
    text: '<h3>Alkohollag (2010:1622)</h3>',
  });
});

test('a Lagrum somebody has written in is left as it stands', async () => {
  vi.mocked(getSupportInvestigation).mockResolvedValue(withLegalBasis('<p>Handläggarens egen text.</p>') as never);
  mountTab();

  await waitFor(() => expect(completeSupportInvestigationSections).toHaveBeenCalled());

  expect(renderTemplateHtml).not.toHaveBeenCalled();
  expect(saveSupportInvestigationSection).not.toHaveBeenCalled();
});

test('a migrated errand is read through the view for migrated investigations', async () => {
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID, channel: 'MIGRATION' } as never });

  mountTab();

  expect(await screen.findByTestId('migrated-investigation')).toBeTruthy();
  expect(completeSupportInvestigationSections).not.toHaveBeenCalled();
});
