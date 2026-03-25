import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import {
  clearSearchResultOnPersonNumberChange,
  disabledIncompleteContactForm,
  displayManuallyAddStakeholderModal,
  searchAndSaveContactPersonStakeholder,
  searchAndSavePersonStakeholder,
  sendCorrectDataOnManualAddPerson,
  supportManagementEmployeeSearch,
  supportManagementPersonSearch,
} from '../utils/stakeholder-search';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockEmployee } from './fixtures/mockEmployee';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockOrganizationResponse } from './fixtures/mockOrganizationResponse';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockFacilitiesData,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

test.describe('Errand page', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-aa71-537b5805be27', mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute('**/portalpersondata/PERSONAL/mockusername', mockEmployee, { method: 'GET' });
    await mockRoute('**/organization', mockOrganizationResponse, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute('**/estateByPropertyDesignation/*', mockFacilitiesData, { method: 'GET' });
    await mockRoute('**/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSaveFacilities, { method: 'PATCH' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
  });

  test('shows the correct base errand information', async ({ page, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();
    const errandCategory = mockSupportErrand.labels.find((l) => l.classification === 'CATEGORY');
    const errandType = mockSupportErrand.labels.find((l) => l.classification === 'TYPE');
    const errandSubtype = mockSupportErrand.labels.find((l) => l.classification === 'SUBTYPE');
    await expect(page.locator('[data-cy="labelCategory-input"]').locator('*').filter({ hasText: errandCategory.displayName })).toBeVisible();
    if (errandSubtype) {
      await expect(page.locator(`[data-cy="labelType-input"][placeholder="${errandSubtype.displayName}"]`)).toBeVisible();
    } else {
      await expect(page.locator(`[data-cy="labelType-input"][placeholder="${errandType.displayName}"]`)).toBeVisible();
    }
    await expect(page.locator('.ql-editor').locator('*').filter({ hasText: 'En ärendebeskrivning' })).toBeVisible();
    await expect(page.locator('[data-cy="errand-description-richtext-wrapper"]')).toContainText('En ärendebeskrivning');
    await expect(page.locator('[data-cy="channel-input"]')).toContainText('Fysiskt möte');
    await expect(page.locator('[data-cy="save-button"]')).toContainText('Spara');
  });

  test('allows updating errand information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    // Change changeable values
    await page.locator('[data-cy="labelCategory-input"]').selectOption('Elnät/Servanet');
    await page.locator('[data-cy="errand-description-richtext-wrapper"]').clear();
    await page.locator('[data-cy="errand-description-richtext-wrapper"]').fill('En ändrad beskrivning');
    await page.locator('[data-cy="channel-input"]').selectOption('Chatt');

    // Check changed values
    await expect(page.locator('[data-cy="labelCategory-input"]')).toContainText('Elnät/Servanet');
    await expect(page.locator('[data-cy="labelType-error"]').locator('*').filter({ hasText: 'Välj ärendetyp' })).toBeVisible();
    await expect(page.locator('[data-cy="errand-description-richtext-wrapper"]')).toContainText('En ändrad beskrivning');
    await expect(page.locator('[data-cy="channel-input"]')).toContainText('Chatt');
    await expect(page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara ärende' })).toBeDisabled();

    // Select missing value
    await page.locator('[data-cy="labelType-wrapper"]').click();
    await page.locator('[data-cy="labelType-wrapper"]').locator('*').filter({ hasText: 'Nyanställning' }).click();
    await expect(page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara ärende' })).toBeEnabled();

    // Post form
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('supporterrands/2281') && resp.request().method() === 'PATCH'
      ),
      page.locator('[data-cy="save-button"]').filter({ hasText: 'Spara' }).click(),
    ]);

    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.channel).toBe('CHAT');
    expect(requestBody.classification.category).toBe('ELECTRICITY_SERVANET');
    expect(requestBody.classification.type).toBe('ELECTRICITY_SERVANET/EMPLOYMENT');

    // Check label objects
    const postedCategory = requestBody.labels.find((l: any) => l.classification === 'CATEGORY');
    const postedType = requestBody.labels.find((l: any) => l.classification === 'TYPE');
    const postedSubtype = requestBody.labels.find((l: any) => l.classification === 'SUBTYPE');
    const metadataCategory = mockMetaData.labels.labelStructure.find((l: any) => l.id === postedCategory?.id);
    const metadataType = metadataCategory.labels?.find((l: any) => l.id === postedType?.id);
    const metadataSubtype = metadataType.labels?.find((l: any) => l.id === postedSubtype?.id);
    delete metadataCategory?.labels;
    expect(postedCategory).toEqual(metadataCategory);
    delete metadataType?.labels;
    expect(postedType).toEqual(metadataType);
    delete metadataSubtype?.labels;
    expect(postedSubtype).toEqual(metadataSubtype);

    expect(requestBody.labels.map((label: any) => label.resourcePath)).toContain('ELECTRICITY_SERVANET');
    expect(requestBody.labels.map((label: any) => label.resourcePath)).toContain('ELECTRICITY_SERVANET/EMPLOYMENT');
    expect(requestBody.labels.map((label: any) => label.resourcePath)).toContain(
      'ELECTRICITY_SERVANET/EMPLOYMENT/NEW_EMPLOYMENT'
    );
    expect(requestBody.description).toBe('<p>En ändrad beskrivning</p>');
    expect([200, 304]).toContain(response.status());
  });

  test('validates the person number and organization number fields', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    // Person
    await supportManagementPersonSearch(page);

    // Employee
    await supportManagementEmployeeSearch(page);
  });

  test('shows the correct contact person information', async ({ page, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    // Errand owner
    await expect(page.locator('[data-cy="stakeholder-name"]').filter({ hasText: mockSupportErrand.stakeholders[0].firstName })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-adress"]').filter({ hasText: mockSupportErrand.stakeholders[0].address })).toBeVisible();

    const getContactValue = (stakeholderIndex: number, type: string): string => {
      const stakeholder = mockSupportErrand.stakeholders[stakeholderIndex];
      const channel = stakeholder.contactChannels.find((c: any) => c.type === type);
      expect(channel).toBeDefined();
      return channel!.value;
    };

    const getParameterValue = (stakeholderIndex: number, key: string): string => {
      const stakeholder = mockSupportErrand.stakeholders[stakeholderIndex];
      if (!stakeholder.parameters) {
        throw new Error(`Expected stakeholder #${stakeholderIndex} parameters to be defined`);
      }
      const param = stakeholder.parameters.find((p: any) => p.key === key);
      expect(param).toBeDefined();
      expect(param!.values.length).toBeGreaterThan(0);
      return param!.values[0];
    };

    const getStringValue = (
      stakeholderIndex: number,
      key: keyof (typeof mockSupportErrand.stakeholders)[0]
    ): string => {
      const stakeholder = mockSupportErrand.stakeholders[stakeholderIndex];
      const value = stakeholder[key];
      expect(value).toBeDefined();
      return value as string;
    };

    // Stakeholder 0
    await expect(page.locator('[data-cy="stakeholder-email"]').filter({ hasText: getContactValue(0, 'Email') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-phone"]').filter({ hasText: getContactValue(0, 'Phone') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-title"]').filter({ hasText: getParameterValue(0, 'title') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-department"]').filter({ hasText: getParameterValue(0, 'department') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-referenceNumber"]').filter({ hasText: getParameterValue(0, 'referenceNumber') })).toBeVisible();

    // Contact person #1 (index 1)
    await expect(page.locator('[data-cy="stakeholder-name"]').filter({ hasText: getStringValue(1, 'firstName') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-adress"]').filter({ hasText: getStringValue(1, 'address') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-email"]').filter({ hasText: getContactValue(1, 'Email') })).toBeVisible();

    // Contact person #2 (index 2)
    await expect(page.locator('[data-cy="stakeholder-name"]').filter({ hasText: getStringValue(2, 'firstName') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-adress"]').filter({ hasText: getStringValue(2, 'address') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-email"]').filter({ hasText: getContactValue(2, 'Email') })).toBeVisible();
    await expect(page.locator('[data-cy="stakeholder-phone"]').filter({ hasText: getContactValue(2, 'Phone') })).toBeVisible();

    await expect(page.locator('[data-cy="add-customer-button"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="add-manually-button-person"]')).toBeVisible();
  });

  test('shows the add applicant person button when no applicant exists', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();
    await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeVisible();
    await expect(page.locator('[data-cy="add-manually-button-person"]')).toBeVisible();
  });

  test('shows the add customer person form when button is pressed', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('users/admins'));
    await page.waitForResponse((resp) => resp.url().includes('me'));
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber'));
    await page.waitForResponse((resp) => resp.url().includes('supportmessage'));
    await page.waitForResponse((resp) => resp.url().includes('supportmetadata'));

    await displayManuallyAddStakeholderModal(page);
  });

  test('shows the add contact person form when button is pressed', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('users/admins'));
    await page.waitForResponse((resp) => resp.url().includes('me'));
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber'));
    await page.waitForResponse((resp) => resp.url().includes('supportmessage'));
    await page.waitForResponse((resp) => resp.url().includes('supportmetadata'));

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
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    await disabledIncompleteContactForm(page);
  });

  test('shows search result and sends correct data for a person', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    await searchAndSavePersonStakeholder(page, mockAdressResponse);
  });

  test('shows search result and sends correct data for an employee', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    await page.locator('[data-cy="search-employee-form-PRIMARY"]').click();
    await page.locator('[data-cy="contact-personNumber-owner"]').clear();
    await page.locator('[data-cy="contact-personNumber-owner"]').fill('mockusername');
    await expect(page.locator('[data-cy="contact-personNumber-owner"]').locator('..').locator('button').filter({ hasText: 'Sök' })).toBeEnabled();
    await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
    await page.locator('[data-cy="contact-personNumber-owner"]').locator('..').locator('button').filter({ hasText: 'Sök' }).click();

    await expect(page.locator('[data-cy="search-result"]')).toBeVisible();
    await expect(page.locator('[data-cy="search-result"]')).toContainText('Mock Lastname');
    await expect(page.locator('[data-cy="search-result"]')).toContainText('mockusername');
    await expect(page.locator('[data-cy="search-result"]')).toContainText('(adress saknas)');
    await expect(page.locator('[data-cy="search-result"]')).toContainText('Telefonnummer saknas');
    await expect(page.locator('[data-cy="search-result"]')).toContainText('mock.user@example.com');

    // Submit it
    await page.locator('[data-cy="submit-contact-person-button"]').click();
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('supporterrands/2281/c9a96dcb') && resp.request().method() === 'PATCH'
    );
    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.stakeholders.length).toBe(1);
    const s = requestBody.stakeholders[0];
    expect(s.firstName).toBe(mockEmployee.data.givenname);
    expect(s.organizationName).toBe('');
    expect(s.lastName).toBe(mockEmployee.data.lastname);
    expect(s.externalIdType).toBe('EMPLOYEE');
    expect(s.role).toBe('PRIMARY');
    expect([200, 304]).toContain(response.status());
  });

  test('clears the search result when personnumber changes', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    await clearSearchResultOnPersonNumberChange(page, mockAdressResponse);
  });

  test('sends the correct applicant data for manually filled form, for a person', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('users/admins'));
    await page.waitForResponse((resp) => resp.url().includes('me'));
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber'));
    await page.waitForResponse((resp) => resp.url().includes('supportmessage'));
    await page.waitForResponse((resp) => resp.url().includes('supportmetadata'));

    await page.locator('[data-cy="add-manually-button-owner"]').click();

    await sendCorrectDataOnManualAddPerson(page);
  });

  test('sends the correct applicant data for manually filled form, for an employee', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('users/admins'));
    await page.waitForResponse((resp) => resp.url().includes('me'));
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber'));
    await page.waitForResponse((resp) => resp.url().includes('supportmessage'));
    await page.waitForResponse((resp) => resp.url().includes('supportmetadata'));

    await page.locator('[data-cy="search-employee-form-PRIMARY"]').click();
    await page.locator('[data-cy="add-manually-button-owner"]').click();

    await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveValue('');
    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="contact-address"]').fill('Testaddress');
    await page.locator('[data-cy="contact-careOf"]').fill('TestcareOf');
    await page.locator('[data-cy="contact-zipCode"]').fill('12345');
    // TODO Uncomment when city is added to the form
    // await page.locator('[data-cy="contact-city"]').fill('Teststaden');
    await page.locator('[data-cy="submit-contact-button"]').click();
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('supporterrands/2281/c9a96dcb') && resp.request().method() === 'PATCH'
    );
    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.stakeholders.length).toBe(1);
    const s = requestBody.stakeholders[0];
    expect(s.firstName).toBe('Test');
    expect(s.lastName).toBe('Testsson');
    expect(s.address).toBe('Testaddress');
    expect(s.careOf).toBe('TestcareOf');
    expect(s.zipCode).toBe('12345');
    // TODO Uncomment when city is added to the form
    // expect(s.city).toBe('Teststaden');
    expect(s.externalIdType).toBe('PRIVATE');
    expect(s.role).toBe('PRIMARY');
    expect([200, 304]).toContain(response.status());
  });

  test('sends the correct secondary contact data for manually filled form, for a person', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
    await expect(page.locator('[data-cy="add-manually-button-person"]')).toBeEnabled();
    await page.locator('[data-cy="add-manually-button-person"]').click();

    await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveValue('');
    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="contact-address"]').fill('Testaddress');
    await page.locator('[data-cy="contact-careOf"]').fill('TestcareOf');
    await page.locator('[data-cy="contact-zipCode"]').fill('12345');
    await page.locator('[data-cy="contact-city"]').fill('Teststaden');
    await page.locator('[data-cy="submit-contact-button"]').click();
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('supporterrands/2281/c9a96dcb') && resp.request().method() === 'PATCH'
    );
    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.stakeholders.length).toBe(1);
    const s = requestBody.stakeholders[0];
    expect(s.firstName).toBe('Test');
    expect(s.lastName).toBe('Testsson');
    expect(s.address).toBe('Testaddress');
    expect(s.careOf).toBe('TestcareOf');
    expect(s.zipCode).toBe('12345');
    expect(s.city).toBe('Teststaden');
    expect(s.externalIdType).toBe('PRIVATE');
    expect(s.role).toBe('CONTACT');
    expect([200, 304]).toContain(response.status());
  });

  test('allows editing primary contact person information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand, { method: 'PATCH' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="edit-stakeholder-button-PRIMARY-0"]').click();
    await expect(page.locator('[data-cy="searchmode-selector-modal"]')).not.toBeVisible();
    await page.locator('[data-cy="contact-firstName"]').clear();
    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').clear();
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="submit-contact-button"]').click();
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && resp.request().method() === 'PATCH'
    );
    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.stakeholders.length).toBe(mockSupportErrand.stakeholders.length);
    const s = requestBody.stakeholders[0];
    expect(s.firstName).toBe('Test');
    expect(s.lastName).toBe('Testsson');
    expect(s.externalIdType).toBe('PRIVATE');
    expect(s.role).toBe('PRIMARY');
    expect([200, 304]).toContain(response.status());
  });

  test('allows editing secondary contact person information', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/3f0e57b2-2876-4cb8-000-537b5805be27', mockSupportErrand, { method: 'PATCH' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="edit-stakeholder-button-CONTACT-0"]').click();
    await expect(page.locator('[data-cy="searchmode-selector-modal"]')).not.toBeVisible();
    await page.locator('[data-cy="contact-firstName"]').clear();
    await page.locator('[data-cy="contact-firstName"]').fill('Test');
    await page.locator('[data-cy="contact-lastName"]').clear();
    await page.locator('[data-cy="contact-lastName"]').fill('Testsson');
    await page.locator('[data-cy="role-select"]').selectOption('MANAGER');
    await page.locator('[data-cy="submit-contact-button"]').click();
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && resp.request().method() === 'PATCH'
    );
    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.stakeholders.length).toBe(mockSupportErrand.stakeholders.length);
    const s = requestBody.stakeholders[1];
    expect(s.firstName).toBe('Test');
    expect(s.lastName).toBe('Testsson');
    expect(s.externalIdType).toBe('PRIVATE');
    expect(s.role).toBe('MANAGER');
    expect([200, 304]).toContain(response.status());
  });

  test('sends the correct applicant data for filled out form', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/supporterrands/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      stakeholders: [],
      contact: [],
      customer: [],
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);

    await searchAndSaveContactPersonStakeholder(page, mockAdressResponse, mockPersonIdResponse);
  });
});
