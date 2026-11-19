// @vitest-environment jsdom
import { permitOfInspection, permitsInEffect } from '@common/services/customer-inspection-service';
import { getCustomerAssets } from '@common/services/customer-service';
import { getResolvedRelationsOrThrow } from '@common/services/relations-service';
import { useConfigStore, useMetadataStore, useUserStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportErrandPermitSection } from './support-errand-permit-section.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('@common/services/relations-service', () => ({ getResolvedRelationsOrThrow: vi.fn() }));
vi.mock('@common/services/customer-service', () => ({ getCustomerAssets: vi.fn() }));
vi.mock('@common/services/customer-inspection-service', () => ({
  permitOfInspection: vi.fn(),
  permitsInEffect: vi.fn(),
  permitName: (permit: { title?: string }) => permit.title ?? '',
  linkInspectionToPermit: vi.fn(),
}));
vi.mock('@common/components/customer-menu/customer-permit-choice.component', () => ({
  CustomerPermitChoice: () => null,
}));

const PERMIT_HOLDER_PARTY_ID = 'c3a1f0de-2b44-4c7e-9a10-5f8d6b2e1c93';
const PERMIT_ERRAND_ID = 'f1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';

const permit = {
  id: 'asset-1',
  title: 'Stadigvarande serveringstillstand',
  status: 'ACTIVE',
  issued: '2026-01-15',
  validTo: null,
  sourceErrandId: PERMIT_ERRAND_ID,
  sourceErrandNumber: 'AOT-26100111',
};

const inspection = {
  id: 'inspection-1',
  stakeholders: [{ role: 'PRIMARY', externalId: PERMIT_HOLDER_PARTY_ID }],
} as unknown as SupportErrand;

const byCy = (dataCy: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-cy="${dataCy}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useMetadataStore.setState({ supportMetadata: { namespace: 'AOT' } } as never);
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
  vi.mocked(permitsInEffect).mockReturnValue([permit] as never);
  vi.mocked(permitOfInspection).mockReturnValue(permit as never);
  vi.mocked(getCustomerAssets).mockResolvedValue([permit] as never);
  vi.mocked(getResolvedRelationsOrThrow).mockResolvedValue({
    relations: [{ target: { resourceId: PERMIT_ERRAND_ID } }],
    caseStatuses: [],
  } as never);
});

afterEach(cleanup);

test('the permit the inspection is linked to is shown with its validity', async () => {
  render(<SupportErrandPermitSection errand={inspection} />);

  await waitFor(() => expect(byCy('inspection-permit')).toBeTruthy());
  expect(byCy('inspection-permit-missing')).toBeFalsy();
});

test('relations that could not be read are not shown as an inspection without a permit', async () => {
  vi.mocked(getResolvedRelationsOrThrow).mockRejectedValue(new Error('the relations could not be read'));

  render(<SupportErrandPermitSection errand={inspection} />);

  await waitFor(() => expect(byCy('inspection-permit-unreadable')).toBeTruthy());
  expect(byCy('inspection-permit-missing')).toBeFalsy();
  expect(byCy('inspection-permit-choose')).toBeFalsy();
});
