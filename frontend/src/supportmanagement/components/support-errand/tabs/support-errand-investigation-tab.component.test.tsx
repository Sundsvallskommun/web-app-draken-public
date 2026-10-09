// @vitest-environment jsdom
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportInvestigation,
  saveSupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
}));
const sectionStub = vi.hoisted(() => ({ handsBack: null as object | null }));

vi.mock('./disclosure/investigation-disclosure.component', () => ({
  SectionDisclosure: ({
    onFinancialSaved,
    saveFinancial,
  }: {
    onFinancialSaved: (investigation: object) => void;
    saveFinancial: { current?: () => Promise<boolean> };
  }) => {
    saveFinancial.current = async () => {
      if (sectionStub.handsBack) onFinancialSaved(sectionStub.handsBack);
      return true;
    };
    return null;
  },
}));
vi.mock('./disclosure/investigation-conclusion-disclosure.component', () => ({
  InvestigationConclusionDisclosure: ({
    values,
    set,
  }: {
    values: { summary: string };
    set: (key: string, value: string) => void;
  }) => (
    <textarea data-testid="summary" value={values.summary} onChange={(e) => set('summary', e.currentTarget.value)} />
  ),
}));

const ERRAND_ID = 'errand-1';

const investigation = {
  id: 'investigation-1',
  version: 3,
  status: 'ACTIVE',
  summary: 'ursprunglig text',
  conclusion: '',
  recommendation: '',
  recommendationMotivation: '',
  sections: [{ id: 'section-1', sectionKey: 'financial_suitability', heading: 'Ekonomisk lämplighet', sortOrder: 3 }],
};

const mountTab = () =>
  render(<SupportErrandInvestigationTab setUnsaved={vi.fn()} setHasContent={vi.fn()} inStep={true} writable={true} />);

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never, tabSavers: {} });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useMetadataStore.setState({ supportMetadata: { decisionOutcomes: [] } } as never);
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
  sectionStub.handsBack = null;
  vi.mocked(getSupportInvestigation).mockResolvedValue(investigation as never);
  vi.mocked(saveSupportInvestigation).mockResolvedValue({ ...investigation, version: 4 } as never);
});

afterEach(cleanup);

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
  const field = await screen.findByTestId('summary');
  fireEvent.change(field, { target: { value: 'ett' } });
  fireEvent.change(field, { target: { value: 'ett ord till' } });

  expect(useSupportStore.getState().tabSavers.investigation).toBe(offered);
});

test('the save that was handed over writes what the field holds now, not what it held then', async () => {
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  const saveFromMount = useSupportStore.getState().tabSavers.investigation;
  const field = await screen.findByTestId('summary');
  fireEvent.change(field, { target: { value: 'det handlaggaren skrev sist' } });

  await saveFromMount();

  expect(saveSupportInvestigation).toHaveBeenCalledTimes(1);
  expect(vi.mocked(saveSupportInvestigation).mock.calls[0][3]).toMatchObject({
    summary: 'det handlaggaren skrev sist',
    version: 3,
  });
});

test('a section saved first raises the version this save must write with', async () => {
  sectionStub.handsBack = { ...investigation, version: 9 };
  mountTab();
  await waitFor(() => expect(useSupportStore.getState().tabSavers.investigation).toBeTypeOf('function'));

  const field = await screen.findByTestId('summary');
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
