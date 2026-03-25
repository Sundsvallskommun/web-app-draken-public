import { Page, expect } from '@playwright/test';
import { mockEnv } from '../fixtures/mock-env';

export const supportManagementPersonSearch = async (page: Page) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill('WORD!');
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).toContainText(
    'Ej giltigt personnummer (ange tolv siffror: ååååmmddxxxx)'
  );
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
};

export const supportManagementEmployeeSearch = async (page: Page) => {
  await page.locator('[data-cy="search-employee-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill('mockusername');
  await expect(
    page.locator('[data-cy="contact-personNumber-owner"]').locator('..').locator('button')
  ).toBeEnabled();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
};

export const supportManagementEnterpriseSearch = async (page: Page) => {
  await page.locator('[data-cy="search-enterprise-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill('WORD!');
  await expect(page.locator('[data-cy="org-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toContainText(
    'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)'
  );
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page
    .locator('[data-cy="contact-orgNumber-owner"]')
    .fill(mockEnv.mockOrganizationNumber.replace('-', ''));
  await expect(page.locator('[data-cy="org-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toContainText(
    'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)'
  );
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill(mockEnv.mockOrganizationNumber);
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="org-number-error-message"]')).not.toBeVisible();
};

export const supportManagementOrganizationSearch = async (page: Page) => {
  await page.locator('[data-cy="search-organization-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill('WORD!');
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toBeVisible();
  await expect(page.locator('[data-cy="org-number-error-message"]')).toContainText(
    'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)'
  );
  await page.locator('[data-cy="contact-orgNumber-owner"]').clear();
  await page.locator('[data-cy="contact-orgNumber-owner"]').fill(mockEnv.mockOrganizationNumber);
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="org-number-error-message"]')).not.toBeVisible();
};

export const displayManuallyAddStakeholderModal = async (page: Page) => {
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeEnabled();
  await page.locator('[data-cy="add-manually-button-owner"]').click();

  await expect(page.locator('[data-cy="contact-externalIdType-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-externalIdType-owner"]')).toHaveValue('PRIVATE');
  await expect(page.locator('[data-cy="contact-role-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-role-owner"]')).toHaveValue('PRIMARY');
  await expect(page.locator('[data-cy="contact-externalId-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-personNumber"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-firstName"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-lastName"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-address"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-careOf"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-zipCode"]')).toBeVisible();
  await expect(page.locator('[data-cy="contact-city"]')).toBeVisible();
};

export const disabledIncompleteContactForm = async (page: Page) => {
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeVisible();
  await expect(page.locator('[data-cy="add-manually-button-owner"]')).toBeEnabled();
  await page.locator('[data-cy="add-manually-button-owner"]').click();

  await expect(page.locator('[data-cy="submit-contact-button"]')).toBeDisabled();
};

export const searchAndSavePersonStakeholder = async (page: Page, mockAdressResponse: any) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
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

  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText('Kim Svensson');
  await expect(page.locator('[data-cy="stakeholder-ssn"]')).toContainText(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText(
    mockAdressResponse.data.addresses[0].address
  );
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText(
    mockAdressResponse.data.addresses[0].postalCode
  );
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText(
    mockAdressResponse.data.addresses[0].city
  );

  await expect(page.locator('[data-cy="save-button"]')).toBeEnabled();
  await page.locator('[data-cy="save-button"]').click();
  await expect(page.locator('[data-cy="save-button"]')).toBeDisabled();

  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText(mockAdressResponse.data.givenname);
  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText(mockAdressResponse.data.lastname);

  const request = await page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH');
  const body = request.postDataJSON();
  expect(body.stakeholders.length).toBe(1);
  const s = body.stakeholders[0];
  expect(s.firstName).toBe(mockAdressResponse.data.givenname);
  expect(s.organizationName).toBe('');
  expect(s.lastName).toBe(mockAdressResponse.data.lastname);
  expect(s.externalIdType).toBe('PRIVATE');
  expect(s.role).toBe('PRIMARY');
};

export const clearSearchResultOnPersonNumberChange = async (page: Page, mockAdressResponse: any) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
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

  // Change personnumber
  await page.locator('[data-cy="contact-personNumber-owner"]').type('1');
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).toBeVisible();

  // Open manual form, it should be empty
  await page.locator('[data-cy="add-manually-button-owner"]').click();
  await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveAttribute('readonly', '');
  await expect(page.locator('[data-cy="contact-personNumber"]')).toHaveValue('');
  await expect(page.locator('[data-cy="contact-firstName"]')).toHaveValue('');
  await expect(page.locator('[data-cy="contact-lastName"]')).toHaveValue('');
  await expect(page.locator('[data-cy="contact-address"]')).toHaveValue('');
  await expect(page.locator('[data-cy="contact-careOf"]')).toHaveValue('');
  await expect(page.locator('[data-cy="contact-zipCode"]')).toHaveValue('');
};

export const sendCorrectDataOnManualAddPerson = async (page: Page) => {
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

  const request = await page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH');
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

  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText('Test');
  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText('Testsson');
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText('Testaddress');
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText('12345');
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toContainText('Teststaden');
};

export const searchAndSaveContactPersonStakeholder = async (
  page: Page,
  mockAdressResponse: any,
  mockPersonIdResponse: any
) => {
  await page.locator('[data-cy="search-person-form-PRIMARY"]').click();
  await page.locator('[data-cy="contact-personNumber-owner"]').clear();
  await page.locator('[data-cy="contact-personNumber-owner"]').fill(mockEnv.mockPersonNumber);
  await expect(page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' })).toBeEnabled();
  await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
  await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
  await expect(page.locator('[data-cy="contact-externalId-owner"]')).toHaveValue(
    mockPersonIdResponse.data.personId
  );
  await page.waitForResponse((resp) => resp.url().includes('address'));
  await expect(page.locator('[data-cy="stakeholder-name"]')).toHaveText(
    mockAdressResponse.data.givenname + ' ' + mockAdressResponse.data.lastname
  );
  await expect(page.locator('[data-cy="stakeholder-adress"]')).toHaveText(
    mockAdressResponse.data.addresses[0].address +
      ' ' +
      mockAdressResponse.data.addresses[0].postalCode +
      ' ' +
      mockAdressResponse.data.addresses[0].city
  );
  await expect(page.locator('[data-cy="stakeholder-phone"]')).toBeVisible();
  await page.locator('[data-cy="new-email-input"]').first().fill(mockEnv.mockEmail);
  await page.locator('[data-cy="add-new-email-button"]').filter({ hasText: 'Lägg till' }).click();
  await page.locator('[data-cy="newPhoneNumber"]').fill(mockEnv.mockPhoneNumberCountryCode);
  await page.locator('[data-cy="newPhoneNumber-button"]').filter({ hasText: 'Lägg till' }).click();
  await page
    .locator('[data-cy="submit-contact-person-button"]')
    .filter({ hasText: 'Lägg till ärendeägare' })
    .click();
  await page.locator('[data-cy="save-button"]').click();

  const request = await page.waitForRequest((req) => req.url().includes('supporterrands') && req.method() === 'PATCH');
  const body = request.postDataJSON();
  const m = mockAdressResponse.data;
  expect(body.stakeholders.length).toBe(1);
  const s = body.stakeholders[0];
  expect(s.firstName).toBe(m.givenname);
  expect(s.lastName).toBe(m.lastname);
  expect(s.role).toBe('PRIMARY');
  expect(s.externalIdType).toBe('PRIVATE');
  expect(s.contactChannels && s.contactChannels.length > 0).toBe(true);
  expect(s.contactChannels[0].value).toBe(mockEnv.mockEmail);
  expect(s.contactChannels[1].value).toBe(mockEnv.mockPhoneNumberCountryCode);

  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText(m.givenname);
  await expect(page.locator('[data-cy="stakeholder-name"]')).toContainText(m.lastname);
  await expect(page.locator('[data-cy="stakeholder-email"]')).toContainText(mockEnv.mockEmail);
  await expect(page.locator('[data-cy="stakeholder-phone"]')).toContainText(mockEnv.mockPhoneNumberCountryCode);
};
