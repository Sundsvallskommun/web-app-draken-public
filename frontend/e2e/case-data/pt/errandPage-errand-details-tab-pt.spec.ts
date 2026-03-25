import { test, expect } from '../../fixtures/base.fixture';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockPurchaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { modifyField } from '../fixtures/mockMexErrand';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';

test.describe('Errand details tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/messages/*', mockMessages);
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/assets/', mockAsset);
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPTErrand_base),
      });
    });
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttachments),
      });
    });
    await mockRoute('**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/contracts/**', mockPurchaseAgreement);
    await mockRoute('**/assets?**', {});
    await mockRoute('**/errands/*/history', mockHistory);
    await mockRoute('**/address', mockAddress, { method: 'POST' });
    await mockRoute('**/errands/*', mockPTErrand_base, { method: 'PATCH' });
    await mockRoute('**/errands/*/facilities', mockPTErrand_base, { method: 'POST' });
    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });
    await mockRoute('**/sourcerelations/**/**', mockRelations);
    await mockRoute('**/targetrelations/**/**', mockRelations);
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations);
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages);
  });

  const goToErrandInformationTab = async (
    page: import('@playwright/test').Page,
    dismissCookieConsent: () => Promise<void>
  ) => {
    await page.goto('arende/PRH-2022-000019');
    await dismissCookieConsent();
    await page.getByText('Ärendeuppgifter').click();
  };

  test('shows the correct fields for a new parking permit', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockPTErrand_base, {
        facilities: [],
      })
    );
    await goToErrandInformationTab(page, dismissCookieConsent);

    await expect(
      page.locator('input[name="application@applicant@capacity"][value="DRIVER"]')
    ).toBeChecked();
    await expect(
      page.locator('input[name="application@applicant@capacity"][value="PASSENGER"]')
    ).not.toBeChecked();

    await expect(page.locator('[data-cy="application.reason-textarea"]')).toHaveValue('Kan inte gå');

    await expect(page.locator('input[value="Krycka/kryckor/käpp"]')).not.toBeChecked();
    await expect(page.locator('input[value="Rullator"]')).toBeChecked();
    await expect(page.locator('input[value="Rullstol (manuell)"]')).not.toBeChecked();
    await expect(page.locator('input[value="Elrullstol"]')).toBeChecked();
    await expect(page.locator('input[value="Inget"]')).not.toBeChecked();

    await expect(
      page.locator('input[name="disability@walkingAbility"][value="true"]')
    ).not.toBeChecked();
    await expect(
      page.locator('input[name="disability@walkingAbility"][value="false"]')
    ).toBeChecked();

    await expect(page.locator('input[name="disability@walkingDistance@beforeRest"]')).toHaveValue('85');

    await expect(page.locator('input[name="disability@walkingDistance@max"]')).toHaveValue('150');

    await expect(page.locator('[data-cy="disability.duration-select"]')).toHaveValue('P0Y');

    await expect(
      page.locator('input[name="consent@contact@doctor"][value="true"]')
    ).not.toBeChecked();
    await expect(
      page.locator('input[name="consent@contact@doctor"][value="false"]')
    ).toBeChecked();

    await expect(
      page.locator('input[name="consent@view@transportationServiceDetails"][value="true"]')
    ).not.toBeChecked();
    await expect(
      page.locator('input[name="consent@view@transportationServiceDetails"][value="false"]')
    ).toBeChecked();

    await expect(
      page.locator('input[name="application@applicant@signingAbility"][value="true"]')
    ).toBeChecked();
    await expect(
      page.locator('input[name="application@applicant@signingAbility"][value="false"]')
    ).not.toBeChecked();
  });

  test('shows the correct fields for a renewal of parking permit', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockPTErrand_base, {
        caseType: 'PARKING_PERMIT_RENEWAL',
        facilities: [],
      })
    );
    await goToErrandInformationTab(page, dismissCookieConsent);

    await expect(
      page.locator('input[name="application@renewal@changedCircumstances"][value="Y"]')
    ).toBeChecked();
    await expect(
      page.locator('input[name="application@renewal@changedCircumstances"][value="N"]')
    ).not.toBeChecked();

    await expect(page.locator('input[name="application@renewal@expirationDate"]')).toHaveValue('2023-12-14');

    await expect(
      page.locator('input[name="application@renewal@medicalConfirmationRequired"][value="yes"]')
    ).toBeChecked();
    await expect(
      page.locator('input[name="application@renewal@medicalConfirmationRequired"][value="no"]')
    ).not.toBeChecked();
  });

  test('shows the correct fields for a lost parking permit', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockPTErrand_base, {
        caseType: 'LOST_PARKING_PERMIT',
        facilities: [],
      })
    );
    await goToErrandInformationTab(page, dismissCookieConsent);

    await expect(page.locator('input[name="application@lostPermit@policeReportNumber"]')).toHaveValue('123456');
  });
});
