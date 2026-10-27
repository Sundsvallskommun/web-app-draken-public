import { expect, type Page } from '@playwright/test';

import { mockJson, RouteTarget } from '../../blocks/routes';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockLeaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockEstatePropertyByDesignation } from '../fixtures/mockEstatePropertyByDesignation';
import { mockHistory } from '../fixtures/mockHistory';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockRelations } from '../fixtures/mockRelations';

/**
 * Route blocks for the contract tab ("Faktura") of a MEX errand. The errand fixture points at the
 * lease agreement fixture (contract 2024-01026); pass a variant of it to show other contract data.
 */

const MEX_CONTRACT_ID = mockLeaseAgreement.data.contractId;

type LeaseAgreementData = typeof mockLeaseAgreement.data;

/** The lease agreement fixture with some fields replaced, wrapped like the BFF response. */
export const leaseAgreementWith = (changes: Partial<LeaseAgreementData> & Record<string, unknown>) => ({
  ...mockLeaseAgreement,
  data: { ...structuredClone(mockLeaseAgreement.data), ...changes },
});

/** KPI the index adjustment help text is based on. */
export const MOCK_KPI = { baseYear: 'KPI_80', period: `${new Date().getFullYear() - 1}-10`, value: 419.35 };

/** Everything the errand page loads around the contract tab, plus reading and saving the contract. */
export const mockMexContractTab = async (
  target: RouteTarget,
  contract: { data: unknown } = mockLeaseAgreement
): Promise<void> => {
  await mockJson(target, '**/users/admins', mockAdmins, { method: 'GET' });
  await mockJson(target, '**/me', mockMe, { method: 'GET' });
  await mockJson(target, '**/featureflags', [], { method: 'GET' });
  await mockJson(target, '**/personid', mockPersonId, { method: 'POST' });
  await mockJson(target, '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });
  await mockJson(target, '**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' });
  await mockJson(target, '**/errand/101', mockMexErrand_base, { method: 'GET' });
  await mockJson(target, /\/errand\/\d+\/attachments$/, mockAttachments, { method: 'GET' });
  await mockJson(target, /\/errand\/\d+\/messages$/, mockMessages, { method: 'GET' });
  await mockJson(target, '**/messages/MEX-2024-000280*', mockMessages, { method: 'GET' });
  await mockJson(target, '**/errands/*/history', mockHistory, { method: 'GET' });
  await mockJson(target, '**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
  await mockJson(target, '**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' });
  await mockJson(target, '**/sourcerelations/**/**', mockRelations, { method: 'GET' });
  await mockJson(target, '**/targetrelations/**/**', mockRelations, { method: 'GET' });
  await mockJson(target, '**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
  await mockJson(target, '**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
    method: 'GET',
  });
  await mockJson(target, '**/assets**', mockAsset, { method: 'GET' });
  await mockJson(target, '**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' });
  await mockJson(
    target,
    '**/schemas/*/ui-schema',
    { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' },
    {
      method: 'GET',
    }
  );
  await mockJson(target, '**/estateByPropertyDesignation/**', mockEstatePropertyByDesignation, { method: 'GET' });
  await mockJson(target, '**/billingdatacollector/kpi*', MOCK_KPI, { method: 'GET' });
  await mockJson(target, `**/contracts/${MEX_CONTRACT_ID}`, contract, { method: 'GET' });
  await mockJson(target, `**/contracts/${MEX_CONTRACT_ID}`, contract, { method: 'PUT' });
};

/** Opens the errand and its "Faktura" tab once the errand and its contract have loaded. */
export const openMexContractTab = async (page: Page, dismissCookieConsent: () => Promise<void>): Promise<void> => {
  const errandResponse = page.waitForResponse(
    (resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200
  );
  const contractResponse = page.waitForResponse(
    (resp) => resp.url().includes(`/contracts/${MEX_CONTRACT_ID}`) && resp.status() === 200
  );
  await page.goto(`arende/${mockMexErrand_base.data.id}`);
  await errandResponse;
  await contractResponse;
  await dismissCookieConsent();
  await page.getByRole('tab', { name: 'Faktura', exact: true }).click({ force: true });
  await expect(page.locator('[data-cy="contract-type-select"]')).toBeVisible();
};

/** Fills in the contract period, which the contract API requires before it can be saved. */
export const fillContractPeriod = async (page: Page): Promise<void> => {
  await page.locator('[data-cy="avtalstid-disclosure"] button.sk-disclosure-header-button').click();
  await page.locator('[data-cy="avtalstid-start"]').clear();
  await page.locator('[data-cy="avtalstid-start"]').fill('2024-01-01');
  await page.locator('[data-cy="all-notice-period"]').clear();
  await page.locator('[data-cy="all-notice-period"]').fill('1');
};
