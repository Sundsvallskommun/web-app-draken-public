import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { test, expect } from '../../fixtures/base.fixture';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockEstateByAddress } from '../fixtures/mockEstateByAddress';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';
import { mockEstatePropertyByDesignation } from '../fixtures/mockEstatePropertyByDesignation';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base, modifyField } from '../fixtures/mockMexErrand';
import { mockPermits } from '../fixtures/mockPermits';
import { mockRelations } from '../fixtures/mockRelations';
import { preventProcessExtraParameters } from '../utils/utils';

const checkExtraParameter = (extraParameters: ExtraParameter[], key: string, value: string) => {
  const param = extraParameters.find((p: any) => p.key === key);
  expect(param).toBeDefined();
  expect(param?.values?.[0]).toBe(value);
};

export const replaceExtraParameter = (extraParameters: ExtraParameter[], newParameter: ExtraParameter) => {
  return extraParameters.some((p) => p.key === newParameter.key)
    ? extraParameters.map((p) => (p.key === newParameter.key ? newParameter : p))
    : [...extraParameters, newParameter];
};

test.describe('Errand details tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' }, { method: 'GET' });
    await mockRoute('**/messages/*', mockMessages, { method: 'GET' });
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' }); // @mockMe
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/parking-permits/', mockPermits, { method: 'GET' });
    await mockRoute('**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits, { method: 'GET' });
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMexErrand_base) });
    }); // @getErrandById
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute('**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await mockRoute('**/address', mockAddress, { method: 'POST' }); // @postAddress
    await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' }); // @saveExtraParameters
    await mockRoute('**/errands/*', mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/errands/*/facilities', mockMexErrand_base, { method: 'POST' });
    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMessages) });
    });
    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment

    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' }); // @getSourceRelations
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' }); // @getTargetRelations
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' }); // @getConversations
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' }); // @getConversationMessages
    await mockRoute('**/assets**', mockAsset, { method: 'GET' }); // @getAssets
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' }); // @getJsonSchema
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' }, { method: 'GET' }); // @getUiSchema
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo
  });

  const goToErrandInformationTab = async (page, dismissCookieConsent) => {
    await page.goto('arende/MEX-2024-000280');
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await page.getByRole('button', { name: 'Ärendeuppgifter' }).click();

    // Should exist on all MEX case types
    await expect(page.locator('[data-cy="caseMeaning-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="facilities-disclosure"]')).toBeVisible();
    await page.locator('[data-cy="facilities-disclosure"]').click();
    await expect(page.locator('[data-cy="section-Övergripande-disclosure"]')).toBeVisible();
  };

  const checkEstateInfo = async (page) => {
    await expect(page.locator('[data-cy="suggestion-list"]')).toBeVisible();
    await page.locator('[data-cy="suggestion-list"] label').first().click();
    await expect(page.locator('[data-cy="estate-table"]')).toBeVisible();
    await page.locator('[data-cy="realEstate-0"]').locator('a').filter({ hasText: 'Visa fastighetsinformation' }).click();

    await expect(page.locator('[data-cy="estate-designation"]').getByText(mockEstateInfo11.data?.designation)).toBeVisible();
    await expect(page.locator('[data-cy="ownership-tab"]')).toBeVisible();
    await expect(page.locator('[data-cy="area-and-actions-tab"]')).toBeVisible();
    await expect(page.locator('[data-cy="owner-name"]').getByText(mockEstateInfo11.data?.ownership[0].owner.name)).toBeVisible();
    await expect(page.locator('[data-cy="owner-address"]').getByText(mockEstateInfo11.data?.ownership[0].owner.address)).toBeVisible();
    await expect(page.locator('[data-cy="owner-postal-and-city"]').getByText(mockEstateInfo11.data?.ownership[0].owner.city)).toBeVisible();

    await expect(page.locator('[data-cy="owner-share"]')).toBeVisible();
    await expect(page.locator('[data-cy="owner-enrollment"]')).toBeVisible();
    await expect(page.locator('[data-cy="owner-filenumber"]')).toBeVisible();
    await expect(page.locator('[data-cy="estate-changes"]')).toBeVisible();

    await page.locator('[data-cy="area-and-actions-tab"]').click({ force: true });
    await expect(page.locator('[data-cy="total-area"]').getByText(String(mockEstateInfo11.data?.totalArea))).toBeVisible();
    await expect(page.locator('[data-cy="total-area-land"]').getByText(String(mockEstateInfo11.data?.totalAreaLand))).toBeVisible();
    await expect(page.locator('[data-cy="total-area-water"]').getByText(String(mockEstateInfo11.data?.totalAreaWater))).toBeVisible();

    await expect(page.locator('[data-cy="action-table"]')).toBeVisible();
    await expect(page.locator('[data-cy="action-type"]').getByText(mockEstateInfo11.data.actions[0].actionType1)).toBeVisible();
    await expect(page.locator('[data-cy="action-date"]').getByText(mockEstateInfo11.data.actions[0].actionDate)).toBeVisible();
    await expect(page.locator('[data-cy="action-file-designation"]').getByText(mockEstateInfo11.data.actions[0].fileDesignation)).toBeVisible();

    await page.locator('[data-cy="close-estate-info-button"]').click({ force: true });
    await expect(page.locator('[data-cy="save-and-continue-button"]')).toBeEnabled();
    await page.locator('[data-cy="remove-estate-0"]').filter({ hasText: 'Ta bort' }).click();
    await expect(page.locator('[data-cy="estate-table"]').getByText('Inga fastigheter tillagda')).toBeVisible();
    await expect(page.locator('[data-cy="save-and-continue-button"]')).toBeDisabled();
  };

  test('search property designation', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/estateByPropertyDesignation/**', mockEstatePropertyByDesignation, { method: 'GET' }); // @getEstatePropertyByDesignation
    await mockRoute('**/estateInfo/**', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockMexErrand_base, { facilities: [] }),
      { method: 'GET' }
    ); // @getErrand
    await goToErrandInformationTab(page, dismissCookieConsent);

    await page.locator('[data-cy="facility-search"]').type('sundsvall 3:109', { delay: 100 });
    await page.waitForResponse((resp) => resp.url().includes('/estateByPropertyDesignation/') && resp.status() === 200);

    await checkEstateInfo(page);
  });

  test('search address', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/estateByAddress/**', mockEstateByAddress, { method: 'GET' });
    await mockRoute('**/estateInfo/**', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockMexErrand_base, { facilities: [] }),
      { method: 'GET' }
    ); // @getErrand

    await goToErrandInformationTab(page, dismissCookieConsent);

    await page.locator('[data-cy="search-address-radio-button"]').check();
    await page.locator('[data-cy="facility-search"]').type('Testvägen 1', { delay: 100 });

    await checkEstateInfo(page);
  });

  test('case MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockMexErrand_base, { caseType: 'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE' }),
      { method: 'GET' }
    ); // @getErrand

    await goToErrandInformationTab(page, dismissCookieConsent);
  });

  test('case MEX_LEASE_REQUEST', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockMexErrand_base, { caseType: 'MEX_LEASE_REQUEST' }),
      { method: 'GET' }
    ); // @getErrand

    await goToErrandInformationTab(page, dismissCookieConsent);

    await page.locator('[data-cy="reason-textarea"]').fill('Mock text 1');
    await page.locator('[data-cy="fromDate-input"]').fill('2024-06-30');
    await page.locator('[data-cy="toDate-input"]').fill('2024-07-30');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text 2');

    await page.locator('[data-cy="save-and-continue-button"]').click();

    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'reason', 'Mock text 1');
    checkExtraParameter(body, 'fromDate', '2024-06-30');
    checkExtraParameter(body, 'toDate', '2024-07-30');
    checkExtraParameter(body, 'otherInformation', 'Mock text 2');
    preventProcessExtraParameters(body);
  });

  test('case MEX_BUY_LAND_FROM_THE_MUNICIPALITY', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockMexErrand_base, { caseType: 'MEX_BUY_LAND_FROM_THE_MUNICIPALITY' }),
      { method: 'GET' }
    ); // @getErrand

    await goToErrandInformationTab(page, dismissCookieConsent);

    await page.locator('[data-cy="errandInformation-textarea"]').fill('Mock text 1');
    await page.locator('[data-cy="typeOfEstablishment-textarea"]').fill('Mock text 2');
    await page.locator('[data-cy="jobOpportunities-textarea"]').fill('Mock text 3');
    await page.locator('[data-cy="constructionOfBuildings-textarea"]').fill('Mock text 4');
    await page.locator('[data-cy="landArea-input"]').fill('Mock text 5');
    await page.locator('[data-cy="electricity-input"]').fill('Mock text 6');
    await page.locator('[data-cy="timetable-input"]').fill('2024-06-15');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text 7');

    await page.locator('[data-cy="save-and-continue-button"]').click();

    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'errandInformation', 'Mock text 1');
    checkExtraParameter(body, 'typeOfEstablishment', 'Mock text 2');
    checkExtraParameter(body, 'jobOpportunities', 'Mock text 3');
    checkExtraParameter(body, 'constructionOfBuildings', 'Mock text 4');
    checkExtraParameter(body, 'landArea', 'Mock text 5');
    checkExtraParameter(body, 'electricity', 'Mock text 6');
    checkExtraParameter(body, 'timetable', '2024-06-15');
    checkExtraParameter(body, 'otherInformation', 'Mock text 7');
    preventProcessExtraParameters(body);
  });

  test('case MEX_SELL_LAND_TO_THE_MUNICIPALITY', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_SELL_LAND_TO_THE_MUNICIPALITY' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="reason-textarea"]').fill('Mock text 1');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text 2');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'reason', 'Mock text 1');
    checkExtraParameter(body, 'otherInformation', 'Mock text 2');
  });

  test('case MEX_SQUARE_PLACE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_SQUARE_PLACE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="taxBill_request-select"]').selectOption({ index: 1 });
    await page.locator('[data-cy="location_1-input"]').fill('Torget 1');
    await page.locator('[data-cy="location_2-input"]').fill('Torget 2');
    await page.locator('[data-cy="location_3-input"]').fill('Torget 3');
    await page.locator('[data-cy="occasion1.fromDate-input"]').fill('2024-06-15');
    await page.locator('[data-cy="occasion1.toDate-input"]').fill('2024-06-16');
    await page.locator('[data-cy="occasion2.fromDate-input"]').fill('2024-07-15');
    await page.locator('[data-cy="occasion2.toDate-input"]').fill('2024-07-16');
    await page.locator('[data-cy="occasion3.fromDate-input"]').fill('2024-08-15');
    await page.locator('[data-cy="occasion3.toDate-input"]').fill('2024-08-16');
    await page.locator('[data-cy="occasion4.fromDate-input"]').fill('2024-09-15');
    await page.locator('[data-cy="occasion4.toDate-input"]').fill('2024-09-16');
    await page.locator('[data-cy="occasion5.fromDate-input"]').fill('2024-10-15');
    await page.locator('[data-cy="occasion5.toDate-input"]').fill('2024-10-16');
    await expect(page.locator('[data-cy="electricity-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="electricity-radio-button-0"]')).toHaveValue('Ja');
    await page.locator('[data-cy="electricity-radio-button-0"]').check();
    await expect(page.locator('[data-cy="water_sewage-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="water_sewage-radio-button-0"]')).toHaveValue('Ja');
    await page.locator('[data-cy="water_sewage-radio-button-0"]').check();
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'location_1', 'Torget 1');
    checkExtraParameter(body, 'location_2', 'Torget 2');
    checkExtraParameter(body, 'location_3', 'Torget 3');
    checkExtraParameter(body, 'occasion1.fromDate', '2024-06-15');
    checkExtraParameter(body, 'occasion1.toDate', '2024-06-16');
    checkExtraParameter(body, 'occasion2.fromDate', '2024-07-15');
    checkExtraParameter(body, 'occasion2.toDate', '2024-07-16');
    checkExtraParameter(body, 'occasion3.fromDate', '2024-08-15');
    checkExtraParameter(body, 'occasion3.toDate', '2024-08-16');
    checkExtraParameter(body, 'occasion4.fromDate', '2024-09-15');
    checkExtraParameter(body, 'occasion4.toDate', '2024-09-16');
    checkExtraParameter(body, 'occasion5.fromDate', '2024-10-15');
    checkExtraParameter(body, 'occasion5.toDate', '2024-10-16');
    checkExtraParameter(body, 'electricity', 'Ja');
    checkExtraParameter(body, 'water_sewage', 'Ja');
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_BUY_SMALL_HOUSE_PLOT', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_BUY_SMALL_HOUSE_PLOT' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    checkExtraParameter(request.postDataJSON(), 'otherInformation', 'Mock text');
  });

  test('case MEX_APPLICATION_FOR_ROAD_ALLOWANCE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, {
      caseType: 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE',
      extraParameters: [...mockMexErrand_base.data.extraParameters, { key: 'propertyDesignation', values: ['Test property'] }],
    }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await expect(page.locator('[data-cy="applicantType-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="applicantType-radio-button-0"]')).toHaveValue('Privatperson');
    await page.locator('[data-cy="applicantType-radio-button-0"]').check();
    await expect(page.locator('[data-cy="applicantType-radio-button-1"]')).toHaveValue('Representant för förening');
    await expect(page.locator('[data-cy="roadType-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="roadType-radio-button-0"]')).toHaveValue('Enskild väg med statsbidrag');
    await expect(page.locator('[data-cy="roadType-radio-button-1"]')).toHaveValue('Enskild väg UTAN statsbidrag');
    await page.locator('[data-cy="roadType-radio-button-1"]').check();
    await expect(page.locator('[data-cy="registrationAddressStatus-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="registrationAddressStatus-radio-button-0"]')).toHaveValue('Ja jag är folkbokförd');
    await expect(page.locator('[data-cy="registrationAddressStatus-radio-button-1"]')).toHaveValue('Nej jag är inte folkbokförd');
    await page.locator('[data-cy="registrationAddressStatus-radio-button-1"]').check();
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await expect(page.locator('[data-cy="account.type-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="account.type-radio-button-0"]')).toHaveValue('Bankgiro');
    await expect(page.locator('[data-cy="account.type-radio-button-1"]')).toHaveValue('Plusgiro');
    await expect(page.locator('[data-cy="account.type-radio-button-2"]')).toHaveValue('Bankkonto');
    await page.locator('[data-cy="account.type-radio-button-2"]').check();
    await page.locator('[data-cy="account.bank-input"]').first().fill('Testbank');
    await page.locator('[data-cy="account.owner-input"]').first().fill('Test Testarsson');
    await page.locator('[data-cy="account.number-input"]').first().fill('1234567890');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    checkExtraParameter(body, 'registrationAddressStatus', 'Nej jag är inte folkbokförd');
    checkExtraParameter(body, 'roadType', 'Enskild väg UTAN statsbidrag');
    checkExtraParameter(body, 'account.bank', 'Testbank');
    checkExtraParameter(body, 'account.owner', 'Test Testarsson');
    checkExtraParameter(body, 'account.type', 'Bankkonto');
    preventProcessExtraParameters(body);
  });

  test('case MEX_UNAUTHORIZED_RESIDENCE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_UNAUTHORIZED_RESIDENCE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_LAND_RIGHT', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_LAND_RIGHT' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_PROTECTIVE_HUNTING', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_PROTECTIVE_HUNTING' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="sightingLocation-textarea"]').fill('Mock text 1');
    await page.locator('[data-cy="sightingTime-input"]').fill('2024-06-05T10:00');
    await expect(page.locator('[data-cy="urgent-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="urgent-radio-button-0"]')).toHaveValue('Ja');
    await page.locator('[data-cy="urgent-radio-button-0"]').check();
    await expect(page.locator('[data-cy="urgent-radio-button-1"]')).toHaveValue('Nej');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text 2');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'sightingLocation', 'Mock text 1');
    checkExtraParameter(body, 'sightingTime', '2024-06-05T10:00');
    checkExtraParameter(body, 'urgent', 'Ja');
    checkExtraParameter(body, 'otherInformation', 'Mock text 2');
    preventProcessExtraParameters(body);
  });

  test('case MEX_LAND_INSTRUCTION', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_LAND_INSTRUCTION' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_OTHER', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_OTHER' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
    await expect(page.locator('[data-cy="save-and-continue-button"]')).toBeDisabled();
  });

  test('case MEX_LAND_SURVEYING_OFFICE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_LAND_SURVEYING_OFFICE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    preventProcessExtraParameters(request.postDataJSON());
  });

  test('case MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE (extra parameters)', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_INVOICE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_INVOICE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="invoiceNumber-input"]').fill('12345');
    await page.locator('[data-cy="invoiceRecipient-input"]').fill('Test Testarsson');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'invoiceNumber', '12345');
    checkExtraParameter(body, 'invoiceRecipient', 'Test Testarsson');
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_REQUEST_FOR_PUBLIC_DOCUMENT', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_REQUEST_FOR_PUBLIC_DOCUMENT' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'otherInformation', 'Mock text');
    preventProcessExtraParameters(body);
  });

  test('case MEX_TERMINATION_OF_LEASE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_TERMINATION_OF_LEASE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await expect(page.locator('[data-cy="reason-radio-button-group"]')).toBeVisible();
    await expect(page.locator('[data-cy="reason-radio-button-0"]')).toHaveValue('Jag behöver inte använda marken längre');
    await expect(page.locator('[data-cy="reason-radio-button-1"]')).toHaveValue('Jag har flyttat');
    await page.locator('[data-cy="reason-radio-button-1"]').check();
    await expect(page.locator('[data-cy="reason-radio-button-2"]')).toHaveValue('Arrendatorn har avlidit');
    await page.locator('[data-cy="reason.other-textarea"]').fill('Mock text 1');
    await page.locator('[data-cy="fromDate-input"]').fill('2024-06-05');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text 2');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'reason', 'Jag har flyttat');
    checkExtraParameter(body, 'reason.other', 'Mock text 1');
    checkExtraParameter(body, 'fromDate', '2024-06-05');
    checkExtraParameter(body, 'otherInformation', 'Mock text 2');
    preventProcessExtraParameters(body);
  });

  test('case MEX_HUNTING_LEASE', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', modifyField(mockMexErrand_base, { caseType: 'MEX_HUNTING_LEASE' }), { method: 'GET' });
    await goToErrandInformationTab(page, dismissCookieConsent);
    await page.locator('[data-cy="reason-textarea"]').fill('Mock text 1');
    await page.locator('[data-cy="fromDate-input"]').fill('2024-06-05');
    await page.locator('[data-cy="otherInformation-textarea"]').fill('Mock text 2');
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const request = await page.waitForRequest((req) => req.url().includes('/extraparameters') && req.method() === 'PATCH');
    const body = request.postDataJSON();
    checkExtraParameter(body, 'reason', 'Mock text 1');
    checkExtraParameter(body, 'fromDate', '2024-06-05');
    checkExtraParameter(body, 'otherInformation', 'Mock text 2');
    preventProcessExtraParameters(body);
  });
});
