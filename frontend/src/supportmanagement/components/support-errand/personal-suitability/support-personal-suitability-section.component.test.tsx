// @vitest-environment jsdom
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import {
  assessSupportSuitability,
  getSupportSuitabilityPeople,
  type SupportSuitabilityPerson,
} from '@supportmanagement/services/support-personal-suitability-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportPersonalSuitabilitySection } from './support-personal-suitability-section.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
const reset = vi.fn();
vi.mock('react-hook-form', () => ({ useFormContext: () => ({ formState: { dirtyFields: {} }, reset }) }));
vi.mock('@supportmanagement/services/support-errand-service', () => ({ getSupportErrandById: vi.fn() }));
vi.mock('@supportmanagement/services/support-personal-suitability-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportSuitabilityPeople: vi.fn(),
  assessSupportSuitability: vi.fn(),
}));

const ERRAND_ID = 'd2c1e9a4-7b53-4f08-9a16-5c3b8e7d4f02';
const EDWIN = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';

const edwin: SupportSuitabilityPerson = {
  partyId: EDWIN,
  name: 'Edwin Molina',
  identityCode: mockEnv.mockPersonNumberDashed,
  roles: 'Verkställande direktör',
  assessment: '',
  comment: '',
};

/** The errand as it stands once the verdict has been written to the stakeholder. */
const errandWithVerdict = {
  id: ERRAND_ID,
  stakeholders: [
    {
      externalId: EDWIN,
      parameters: [
        { key: 'PBI', values: ['true'] },
        { key: 'PBI_ASSESSMENT', values: ['APPROVED'] },
        { key: 'PBI_ASSESSMENT_COMMENT', values: ['Inget att anmärka.'] },
      ],
    },
  ],
};

const saveRef = { current: undefined as (() => Promise<boolean>) | undefined };

const mountSection = () =>
  render(<SupportPersonalSuitabilitySection writable={true} onEdited={vi.fn()} saveRef={saveRef} />);

const fieldOf = (part: string) => document.querySelector(`[data-cy="suitability-${part}-${EDWIN}"]`) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  saveRef.current = undefined;
  useSupportStore.setState({ supportErrand: { id: ERRAND_ID } as never, pbiSignal: undefined });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  vi.mocked(getSupportSuitabilityPeople).mockResolvedValue([edwin]);
  vi.mocked(assessSupportSuitability).mockResolvedValue(undefined);
  vi.mocked(getSupportErrandById).mockResolvedValue({ errand: errandWithVerdict } as never);
});

afterEach(cleanup);

const writeAVerdict = async () => {
  mountSection();
  await waitFor(() => expect(fieldOf('assessment')).toBeTruthy());
  fireEvent.change(fieldOf('assessment'), { target: { value: 'APPROVED' } });
  fireEvent.change(fieldOf('comment'), { target: { value: 'Inget att anmärka.' } });
  await expect(saveRef.current?.()).resolves.toBe(true);
};

test('the errand is read back after a verdict, so saving Grundinformation cannot write it away again', async () => {
  await writeAVerdict();

  expect(getSupportErrandById).toHaveBeenCalledWith(ERRAND_ID, '2281');
  expect(useSupportStore.getState().supportErrand).toEqual(errandWithVerdict);
});

test('the form that owns the stakeholders is told, and keeps what the handler has not saved', async () => {
  await writeAVerdict();

  expect(reset).toHaveBeenCalledWith(errandWithVerdict, { keepDirtyValues: true });
});

test('every list of the people is told to read itself afresh', async () => {
  await writeAVerdict();

  expect(useSupportStore.getState().pbiSignal?.errandId).toBe(ERRAND_ID);
});

test('nothing is read back when no verdict was changed', async () => {
  mountSection();
  await waitFor(() => expect(fieldOf('assessment')).toBeTruthy());

  await expect(saveRef.current?.()).resolves.toBe(true);

  expect(assessSupportSuitability).not.toHaveBeenCalled();
  expect(getSupportErrandById).not.toHaveBeenCalled();
});
