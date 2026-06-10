import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockOrganizationResponse } from './fixtures/mockOrganizationResponse';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockFacilitiesData,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandWithFacilities,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
import { mockNotifications } from './fixtures/mockSupportNotifications';
//TODO:Update mockdata
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { disabledIncompleteContactForm } from '../utils/stakeholder-search';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';
import { mockEnv } from '../fixtures/mock-env';
import type { Page } from '@playwright/test';

// Local corrected helpers (the shared utils/stakeholder-search.ts variants assert
// against pre-@sk-web-gui-bump DOM: validation now fires on "Sök" click rather than
// on change, externalIdType/role are hidden inputs, and the manual-add form omits the
// personNumber field when no search was performed). These mirror the current DOM.
const supportManagementPersonSearch = async (page: Page) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill('WORD!');
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).toContainText(
    'Ej giltigt personnummer (ange tolv siffror: ååååmmddxxxx)'
  );
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
};

const supportManagementEnterpriseSearch = async (page: Page) => {
  await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill('WORD!');
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toContainText(
    'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)'
  );
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill(mockEnv.mockOrganizationNumber);
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="org-number-error-message"]')).not.toBeVisible();
};

const supportManagementOrganizationSearch = async (page: Page) => {
  await page.locator('[data-cy="search-organization-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill('WORD!');
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toContainText(
    'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)'
  );
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill(mockEnv.mockOrganizationNumber);
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="org-number-error-message"]')).not.toBeVisible();
};

const displayManuallyAddStakeholderModal = async (page: Page) => {
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeEnabled();
  await page.locator('[data-cy="add-manually-button-owner"]').click();

  // externalIdType and role are hidden inputs after the bump
  await expect(page.locator('[data-cy="contact-externalIdType-owner"]')).toHaveValue('PRIVATE');
  await expect(page.locator('[data-cy="contact-role-owner"]')).toHaveValue('PRIMARY');
  await expect(page.locator('[data-cy="contact-firstName"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-lastName"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-address"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-careOf"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-zipCode"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-city"]')).toBeVisible();
};

const searchAndSavePersonStakeholder = async (page: Page, mockAdressResponse: any) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();

  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="search-result"]')).toBeVisible();
  await expect(page.locator('[data-cy="search-result"]')).toContainText('Kim Svensson');
  await expect(page.locator('[data-cy="search-result"]')).toContainText(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="search-result"]')).toContainText(mockAdressResponse.data.addresses[0].address);
  await expect(page.locator('[data-cy="search-result"]')).toContainText(
    mockAdressResponse.data.addresses[0].postalCode
  );
  await expect(page.locator('[data-cy="search-result"]')).toContainText(mockAdressResponse.data.addresses[0].city);

  await page.locator('[data-cy="submit-contact-person-button"]').click();

  await expect(
    page.locator('[data-cy="stakeholder-name"]').filter({ hasText: 'Kim Svensson' })
  ).toBeVisible();

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH'),
    page.locator('[data-cy="save-button"]').click(),
  ]);
  const body = request.postDataJSON();
  expect(body.stakeholders.length).toBe(1);
  const s = body.stakeholders[0];
  expect(s.firstName).toBe(mockAdressResponse.data.givenname);
  expect(s.organizationName).toBe('');
  expect(s.lastName).toBe(mockAdressResponse.data.lastname);
  expect(s.externalIdType).toBe('PRIVATE');
  expect(s.role).toBe('PRIMARY');
};

const clearSearchResultOnPersonNumberChange = async (page: Page, mockAdressResponse: any) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="search-result"]')).toBeVisible();
  await expect(page.locator('[data-cy="search-result"]')).toContainText('Kim Svensson');
  await expect(page.locator('[data-cy="search-result"]')).toContainText(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="search-result"]')).toContainText(mockAdressResponse.data.addresses[0].address);
  await expect(page.locator('[data-cy="search-result"]')).toContainText(
    mockAdressResponse.data.addresses[0].postalCode
  );
  await expect(page.locator('[data-cy="search-result"]')).toContainText(mockAdressResponse.data.addresses[0].city);

  // Change personnumber -> the search result should be cleared
  await page.locator('[data-cy="contact-personNumber-owner"]').type('1');
  await expect(page.locator('[data-cy="search-result"]')).not.toBeVisible();
};

const sendCorrectDataOnManualAddPerson = async (page: Page) => {
  await page.locator('[data-cy="contact-firstName"]').fill('Test');
  await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
  await page.locator('[data-cy="contact-address"]').fill('Testaddress');
  await page.locator('[data-cy="contact-careOf"]').fill('TestcareOf');
  await page.locator('[data-cy="contact-zipCode"]').fill('12345');
  await page.locator('[data-cy="contact-city"]').fill('Teststaden');

  await page.locator('[data-cy="submit-contact-button"]').click();

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH'),
    page.locator('[data-cy="save-button"]').click(),
  ]);
  const body = request.postDataJSON();
  expect(body.stakeholders.length).toBe(1);
  const s = body.stakeholders[0];
  expect(s.firstName).toBe('Test');
  expect(s.lastName).toBe('Testsson');
  expect(s.address).toBe('Testaddress');
  expect(s.careOf).toBe('TestcareOf');
  expect(s.zipCode).toBe('12345');
  expect(s.city).toBe('Teststaden');
  expect(s.externalIdType).toBe('PRIVATE');
  expect(s.role).toBe('PRIMARY');
};

const searchAndSaveContactPersonStakeholder = async (
  page: Page,
  mockAdressResponse: any,
  mockPersonIdResponse: any
) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="search-result"]')).toBeVisible();
  await expect(page.locator('[data-cy="search-result"]')).toContainText(
    mockAdressResponse.data.givenname + ' ' + mockAdressResponse.data.lastname
  );

  await page.locator('[data-cy="new-email-input"]').first().fill(mockEnv.mockEmail);
  await page.locator('[data-cy="add-new-email-button"]').filter({ hasText: 'Lägg till' }).click();
  await page.locator('[data-cy="newPhoneNumber"]').first().fill(mockEnv.mockPhoneNumberCountryCode);
  await page.locator('[data-cy="newPhoneNumber-button"]').filter({ hasText: 'Lägg till' }).click();
  await page
    .locator('[data-cy="submit-contact-person-button"]')
    .filter({ hasText: 'Lägg till ärendeägare' })
    .click();

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH'),
    page.locator('[data-cy="save-button"]').click(),
  ]);
  const body = request.postDataJSON();
  const m = mockAdressResponse.data;
  expect(body.stakeholders.length).toBe(1);
  const s = body.stakeholders[0];
  expect(s.firstName).toBe(m.givenname);
  expect(s.lastName).toBe(m.lastname);
  expect(s.role).toBe('PRIMARY');
  expect(s.externalIdType).toBe('PRIVATE');
  expect(s.contactChannels && s.contactChannels.length > 0).toBe(true);
  expect(s.contactChannels.some((c: any) => c.value === mockEnv.mockEmail)).toBe(true);
  expect(s.contactChannels.some((c: any) => c.value === mockEnv.mockPhoneNumberCountryCode)).toBe(true);
};

test.describe('Errand page', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([
      { name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' },
    ]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27', mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute('**/organization', mockOrganizationResponse, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute('**/estateByPropertyDesignation/*', mockFacilitiesData, { method: 'GET' });
    await mockRoute('**/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSaveFacilities, {
      method: 'PATCH',
    });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
      method: 'GET',
    });
    await mockRoute('**/party/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute('**/2281/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute('**/supportnotifications/2281', mockNotifications, { method: 'GET' });
  });

  test('shows the correct base errand information', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await expect(page.locator('[data-cy="category-input"]').locator('..').filter({ hasText: 'IAF' })).toBeVisible();
    await expect(
      page.locator('[data-cy="type-input"]').locator('..').filter({ hasText: 'Vuxenutbildning' })
    ).toBeVisible();
    await expect(page.locator('[data-cy="errand-description-richtext-wrapper"]')).toContainText('En ärendebeskrivning');

    await expect(page.locator('[data-cy="channel-input"]')).toContainText('Fysiskt möte');
    await expect(page.locator('[data-cy="contactReason-input"]')).toContainText('Välj orsak');
    await page.locator('[data-cy="show-contactReasonDescription-input"]').check({ force: true });
    await expect(page.locator('[data-cy="contactReasonDescription-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara' })).toBeVisible();
  });

  test('allows updating errand information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Change changeable values
    await page.locator('[data-cy="category-input"]').selectOption('BoU');
    await page.locator('[data-cy="errand-description-richtext-wrapper"] .ql-editor').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('En ändrad beskrivning');
    await page.locator('[data-cy="contactReason-input"]').selectOption('Klagomål');
    await page.locator('[data-cy="channel-input"]').selectOption('Chatt');
    await page.locator('[data-cy="show-contactReasonDescription-input"]').check({ force: true });
    await page.locator('[data-cy="contactReasonDescription-input"]').clear();
    await page.locator('[data-cy="contactReasonDescription-input"]').fill('En ändrad orsaksbeskrivning');

    // Check changed values
    await expect(page.locator('[data-cy="category-input"]').locator('..').filter({ hasText: 'BoU' })).toBeVisible();
    await expect(
      page.locator('[data-cy="type-input"]').locator('..').filter({ hasText: 'Välj ärendetyp' })
    ).toBeVisible();
    await expect(page.locator('[data-cy="errand-description-richtext-wrapper"]')).toContainText(
      'En ändrad beskrivning'
    );
    await expect(page.locator('[data-cy="contactReason-input"]')).toContainText('Klagomål');
    await expect(page.locator('[data-cy="channel-input"]')).toContainText('Chatt');
    await expect(page.locator('[data-cy="contactReasonDescription-input"]')).toContainText(
      'En ändrad orsaksbeskrivning'
    );
    await expect(page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara' })).toBeDisabled();

    // Select missing value
    await page.locator('[data-cy="type-input"]').selectOption('Övrigt');
    await expect(page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara' })).toBeEnabled();

    // Post form
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes(`supporterrands/2281/${mockSupportErrand.id}`) && req.method() === 'PATCH'
      ),
      page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara' }).click(),
    ]);

    const body = request.postDataJSON();
    expect(body.channel).toBe('CHAT');
    expect(body.classification.category).toBe('BOU');
    expect(body.classification.type).toBe('OTHER');
    expect(body.description).toBe('<p>En ändrad beskrivning</p>');
    expect(body.contactReason).toBe('Klagomål');
    expect(body.contactReasonDescription).toBe('En ändrad orsaksbeskrivning');
  });

  test('validates the person number and organization number fields', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Person
    await supportManagementPersonSearch(page);

    // Enterprise
    await supportManagementEnterpriseSearch(page);

    // Organization
    await supportManagementOrganizationSearch(page);
  });

  test('shows the correct contact person information', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await expect(page.locator('[data-cy="stakeholder-name"]').filter({ hasText: 'Kim Svensson' })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-email"]').filter({ hasText: 'a@example.com' })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-phone"]').filter({ hasText: mockEnv.mockSecondaryPhoneNumber })).toBeVisible();
    await expect(
      page.locator('[data-cy="stakeholder-adress"]').filter({ hasText: 'NORRMALMSGATAN 4' })
    ).toBeVisible();

    await expect(page.locator('[data-cy="stakeholder-name"]').filter({ hasText: 'Mormor Svensson' })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-email"]').filter({ hasText: 'b@example.com' })).toBeVisible();
    await expect(
      page.locator('[data-cy="stakeholder-phone"]').filter({ hasText: 'Lägg till telefonnummer' })
    ).toBeVisible();
    await expect(
      page.locator('[data-cy="stakeholder-adress"]').filter({ hasText: 'NORRMALMSGATAN 5' })
    ).toBeVisible();

    await expect(page.locator('[data-cy="stakeholder-name"]').filter({ hasText: 'Kompis Svensson' })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-email"]').filter({ hasText: 'c@example.com' })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-phone"]').filter({ hasText: mockEnv.mockPhoneNumber })).toBeVisible();
    await expect(
      page.locator('[data-cy="stakeholder-adress"]').filter({ hasText: 'NORRMALMSGATAN 6' })
    ).toBeVisible();

    await expect(page.locator('[data-cy="add-customer-button"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="add-manually-button-person"]')).toBeVisible();
  });

  test('shows the add applicant person button when no applicant exists', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeVisible();
    await expect(page.locator('[data-cy="add-manually-button-person"]')).toBeVisible();
  });

  test('shows the add customer person form when button is pressed', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await dismissCookieConsent();

    await displayManuallyAddStakeholderModal(page);
  });

  test('shows the add contact person form when button is pressed', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await dismissCookieConsent();
    await page.locator('[data-cy="search-person-form-CONTACT"]').click();

    await displayManuallyAddStakeholderModal(page);
  });

  test('disables incomplete contact form', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await disabledIncompleteContactForm(page);
  });

  test('shows search result and sends correct data for a person', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
    }, { method: 'PATCH' });

    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });

    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await searchAndSavePersonStakeholder(page, mockAdressResponse);
  });

  test('shows search result and sends correct data for an organization', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
    await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
    await page.locator('[data-cy="contact-orgNumber-owner"]').fill(env.mockOrganizationNumber);
    await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('organization')),
      page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click(),
    ]);
    await expect(page.locator('[data-cy="org-number-error-message"]')).not.toBeVisible();

    await expect(page.locator('[data-cy="search-result"]')).toBeVisible();
    await expect(page.locator('[data-cy="search-result"]')).toContainText('Hooli Sweden AB');
    await expect(page.locator('[data-cy="search-result"]')).toContainText(env.mockOrganizationNumber);
    await expect(page.locator('[data-cy="search-result"]')).toContainText(
      mockOrganizationResponse.data.postAddress.city
    );
    await expect(page.locator('[data-cy="search-result"]')).toContainText(
      mockOrganizationResponse.data.postAddress.postalCode
    );
    await expect(page.locator('[data-cy="search-result"]')).toContainText(
      mockOrganizationResponse.data.postAddress.address1
    );
    await expect(page.locator('[data-cy="search-result"]')).toContainText(env.mockPhoneNumber);

    // Submit it
    await page.locator('[data-cy="submit-contact-person-button"]').click();

    await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText(mockOrganizationResponse.data.name);
    await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText(
      mockOrganizationResponse.data.postAddress.address1
    );
    await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText(
      mockOrganizationResponse.data.postAddress.postalCode
    );
    await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText(
      mockOrganizationResponse.data.postAddress.city
    );

    await expect(page.locator('[data-cy="save-button"]')).toBeEnabled();
  });

  test('clears the search result when personnumber changes', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await clearSearchResultOnPersonNumberChange(page, mockAdressResponse);
  });

  test('clears the search result when orgnumber changes', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
    await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
    await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
    await page.locator('[data-cy="contact-orgNumber-owner"]').fill(env.mockOrganizationNumber);
    await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
    await expect(page.locator('[data-cy="org-number-error-message"]')).not.toBeVisible();

    await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
    await expect(page.locator('[data-cy="search-result"]')).toBeVisible();
    await expect(page.locator('[data-cy="search-result"]')).toContainText('Hooli Sweden AB');
    await expect(page.locator('[data-cy="search-result"]')).toContainText(env.mockOrganizationNumber);
    await expect(page.locator('[data-cy="search-result"]')).toContainText(
      mockOrganizationResponse.data.postAddress.address1
    );
    await expect(page.locator('[data-cy="search-result"]')).toContainText(
      mockOrganizationResponse.data.postAddress.postalCode
    );
    await expect(page.locator('[data-cy="search-result"]')).toContainText(
      mockOrganizationResponse.data.postAddress.city
    );
    await expect(page.locator('[data-cy="search-result"]')).toContainText(env.mockPhoneNumber);

    // Change orgnumber -> the search result should be cleared
    await page.locator('[data-cy="contact-orgNumber-owner"]').type('1');
    await expect(page.locator('[data-cy="search-result"]')).not.toBeVisible();
  });

  test('clears the organization number search field when clicking add manually button', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Select enterprise mode
    await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();

    // Type in search field without searching
    await page.locator('[data-cy="contact-orgNumber-owner"]').fill(env.mockOrganizationNumber);

    // Click add manually button
    await page.locator('[data-cy="add-manually-button-owner"]').click();

    // Verify modal opened and organization number is empty
    await expect(page.locator('[data-cy="contact-organizationNumber"]')).toHaveValue('');

    // Close modal
    await page.locator('[data-cy="cancel-contact-button"]').click();

    // Verify search field is cleared
    await expect(page.locator('[data-cy="contact-orgNumber-owner"]')).toHaveValue('');

    // Verify radio button still selected
    await expect(page.locator('[data-cy="search-enterprise-form-PRIMARY"]')).toBeChecked();
  });

  test('clears the person number search field when clicking add manually button', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Select person mode (should be default, but click to be explicit)
    await page.locator('[data-cy="search-person-form-PRIMARY"]').click();

    // Type in search field without searching
    await page.locator('[data-cy="contact-personNumber-owner"]').fill(env.mockPersonNumber);

    // Click add manually button
    await page.locator('[data-cy="add-manually-button-owner"]').click();

    // Verify modal opened and person number field is hidden (manual mode, person)
    await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveCount(0);

    // Close modal
    await page.locator('[data-cy="cancel-contact-button"]').click();

    // Verify search field is cleared
    await expect(page.locator('[data-cy="contact-personNumber-owner"]')).toHaveValue('');

    // Verify radio button still selected
    await expect(page.locator('[data-cy="search-person-form-PRIMARY"]')).toBeChecked();
  });

  test('sends the correct applicant data for manually filled form, for a person', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await dismissCookieConsent();
    await page.locator('[data-cy="add-manually-button-owner"]').click();

    await sendCorrectDataOnManualAddPerson(page);
  });

  test('sends the correct secondary contact data for manually filled form, for a person', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await expect(page.locator('[data-cy="save-button"]')).toBeDisabled();
    await page.locator('[data-cy="add-manually-button-person"]').click();

    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="contact-address"]').fill('Testaddress');
    await page.locator('[data-cy="contact-careOf"]').fill('TestcareOf');
    await page.locator('[data-cy="contact-zipCode"]').fill('12345');
    await page.locator('[data-cy="contact-city"]').fill('Teststaden');

    await page.locator('[data-cy="submit-contact-button"]').click();

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH'),
      page.locator('[data-cy="save-button"]').click(),
    ]);
    const body = request.postDataJSON();
    expect(body.stakeholders.length).toBe(1);
    const s = body.stakeholders[0];
    expect(s.firstName).toBe('Test');
    expect(s.lastName).toBe('Testsson');
    expect(s.address).toBe('Testaddress');
    expect(s.city).toBe('Teststaden');
  });

  test('sends the correct applicant data for manually filled form, for a company', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute('**/supporterrands/errandnumber/KC-00000001', {
      ...mockSupportErrand,
      id: '3f0e57b2-2876-4cb8-000-537b5805be27',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
    await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
    await page.locator('[data-cy="add-manually-button-owner"]').click();

    await expect(page.locator('[data-cy="contact-organizationNumber"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-cy="contact-organizationNumber"]')).toHaveValue('');
    await page.locator('[data-cy="contact-organizationName"]').fill('Test');
    await page.locator('[data-cy="contact-address"]').fill('Testaddress');
    await page.locator('[data-cy="contact-careOf"]').fill('TestcareOf');
    await page.locator('[data-cy="contact-zipCode"]').fill('12345');
    await page.locator('[data-cy="contact-city"]').fill('Teststaden');

    await page.locator('[data-cy="submit-contact-button"]').click();
    await expect(page.locator('[data-cy="save-button"]')).toBeEnabled();

    await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText('Test');
    await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText('Testaddress');
    await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText('12345');
    await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText('Teststaden');
  });

  test('allows editing contact person information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand, {
      method: 'PATCH',
    });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('[data-cy="edit-stakeholder-button-CONTACT-0"]').first().click();
    await expect(page.locator('[data-cy="searchmode-selector-modal"]')).not.toBeVisible();
    await page.locator('[data-cy="contact-firstName"]').clear();
    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').clear();
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="submit-contact-button"]').click();

    await expect(
      page.locator('[data-cy="stakeholder-name"]').filter({ hasText: 'Test Testsson' })
    ).toBeVisible();
  });

  test('allows editing contact organization information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute('**/supporterrands/errandnumber/KC-00000001', {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [
        {
          externalId: '000000-0000',
          externalIdType: 'COMPANY',
          role: 'PRIMARY',
          organizationName: 'Testbolaget',
          firstName: '',
          lastName: '',
          address: 'NORRMALMSGATAN 4',
          zipCode: '851 85',
          country: 'SWEDEN',
          contactChannels: [
            { type: 'Email', value: 'a@example.com' },
            { type: 'Phone', value: mockEnv.mockSecondaryPhoneNumber },
          ],
        },
      ],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();
    await page.locator('[data-cy="edit-stakeholder-button-PRIMARY-0"]').first().click();
    await expect(page.locator('[data-cy="searchmode-selector-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="contact-organizationNumber"]')).toHaveValue('000000-0000');
    await expect(page.locator('[data-cy="contact-organizationName"]')).toHaveValue('Testbolaget');
    await page.locator('[data-cy="contact-organizationName"]').clear();
    await page.locator('[data-cy="contact-organizationName"]').fill('Test');
    await expect(page.locator('[data-cy="contact-lastName"]')).not.toBeVisible();
    await page.locator('[data-cy="submit-contact-button"]').click();

    await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText('Test');
  });

  test('sends the correct applicant data for filled out form', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'PATCH',
    });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await searchAndSaveContactPersonStakeholder(page, mockAdressResponse, mockPersonIdResponse);
  });

  test('make contact to errande owner', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490/admin', {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
    }, { method: 'PATCH' });

    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="add-manually-button-person"]').click();

    await expect(page.locator('[data-cy="submit-contact-button"]')).toBeDisabled();
    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="contact-address"]').fill('Testaddress');
    await page.locator('[data-cy="contact-careOf"]').fill('TestcareOf');
    await page.locator('[data-cy="contact-zipCode"]').fill('12345');
    await page.locator('[data-cy="contact-city"]').fill('Teststaden');

    await expect(page.locator('[data-cy="submit-contact-button"]')).toBeEnabled();
    await page.locator('[data-cy="submit-contact-button"]').click();

    await expect(
      page.locator('[data-cy="stakeholder-name"]').filter({ hasText: 'Test Testsson' })
    ).toBeVisible();

    await expect(page.locator('[data-cy="make-stakeholder-owner-button"]')).toBeEnabled();
    await page.locator('[data-cy="make-stakeholder-owner-button"]').click();

    await page.locator('article.sk-modal-dialog button').filter({ hasText: 'Ja' }).click();

    await expect(page.locator('[data-cy="save-button"]')).toBeEnabled();

    await Promise.all([
      page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH'),
      page.locator('[data-cy="save-button"]').click(),
    ]);
  });

  test('shows the correct estate information', async ({ page, mockRoute, dismissCookieConsent }) => {
    const patchFacility = {
      id: 123,
      version: 1,
      created: '2024-01-01',
      updated: '2024-06-30',
      description: 'beskrivning',
      address: 'Adress1',
      facilityCollectionName: 'name',
      mainFacility: true,
      facilityType: 'BOSTAD',
    };
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, {
      method: 'GET',
    });
    await page.goto('arende/KC-00000001');
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await mockRoute(
      '**/supporterrands/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      patchFacility,
      { method: 'PATCH' }
    );
    await mockRoute('**/estateByPropertyDesignation/Balder%201', mockFacilitiesData, { method: 'GET' });
    await dismissCookieConsent();

    // add
    await page.locator('[data-cy="facility-disclosure"]').click();
    await page.locator('[data-cy="facility-search"]').focus();
    await page.locator('[data-cy="facility-search"]').type('Balder 1', { delay: 100 });
    await page.waitForResponse((resp) => resp.url().includes('estateByPropertyDesignation'));
    await expect(
      page.locator('[data-cy="suggestion-list"] label').nth(0).filter({ hasText: 'BALDER 1' })
    ).toBeVisible();
    await page.locator('.sk-form-combobox-list-option').filter({ hasText: 'BALDER 1' }).click();
    await expect(
      page.locator('[data-cy="manage-sidebar"] [data-cy="save-button"]').filter({ hasText: 'Spara ärende' })
    ).toBeEnabled();

    // check property designation, street and districtname are shown in table
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('Visa fastighetsinformation');
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('SUNDSVALL BALDER 1');
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('Testgatan 1');
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('Testdistrikt 1');

    // Save
    await page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' })
      .click();
    await page.waitForResponse((resp) => resp.url().includes('saveFacilities'));
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await expect(
      page.locator('[data-cy="manage-sidebar"] [data-cy="save-button"]').filter({ hasText: 'Spara ärende' })
    ).toBeDisabled();

    // Remove
    await page.locator('[data-cy="facility-table"]').filter({ hasText: 'Ta bort' }).locator('button').filter({ hasText: 'Ta bort' }).click();
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('Inga fastigheter tillagda');
    await page
      .locator('[data-cy="manage-sidebar"] [data-cy="save-button"]')
      .filter({ hasText: 'Spara ärende' })
      .click();
    await expect(
      page.locator('[data-cy="manage-sidebar"] [data-cy="save-button"]').filter({ hasText: 'Spara ärende' })
    ).toBeDisabled();
  });

  test('displays saved facilities with street address when loading errand', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(
      `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`,
      mockSupportErrandWithFacilities,
      { method: 'GET' }
    );
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Open facilities disclosure
    await page.locator('[data-cy="facility-disclosure"]').click();

    // Verify saved facility data is displayed correctly in table
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('SUNDSVALL BALDER 1');
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('Testgatan 1');
    await expect(page.locator('[data-cy="facility-table"]')).toContainText('Testdistrikt 1');
  });
});
