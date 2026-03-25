import { CaseTypes } from '@casedata/interfaces/case-type';
import { Channels } from '@casedata/interfaces/channels';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Role } from '@casedata/interfaces/role';
import { invalidOrgNumberMessage, invalidSsnMessage, latestBy } from '@common/services/helper-service';
import { test, expect } from '../../fixtures/base.fixture';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockErrand_base } from '../fixtures/mockErrand';
import { mockHistory } from '../fixtures/mockHistory';
import { mockOrganization } from '../fixtures/mockOrganization';
import { mockPersonId } from '../fixtures/mockPersonId';
import dayjs from 'dayjs';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContractAttachment, mockLeaseAgreement, mockPurchaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base, modifyField } from '../fixtures/mockMexErrand';
import { mockPermits } from '../fixtures/mockPermits';
import { mockRelations } from '../fixtures/mockRelations';
import { mockAsset } from '../fixtures/mockAsset';
import { preventProcessExtraParameters } from '../utils/utils';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';

test.describe('Errand page', () => {
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
    await mockRoute('**/errand/101/messages', mockMessages, { method: 'GET' });
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute('**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/contract/2024-01026', mockPurchaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' }); // @getConversations
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' }); // @getConversationMessages
    await mockRoute('**/errands/101', { data: 'ok', message: 'ok' }, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' }); // @saveExtraParameters

    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment

    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' }); // @getSourceRelations
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' }); // @getTargetRelations
    await mockRoute('**/assets**', mockAsset, { method: 'GET' }); // @getAssets

    await mockRoute('**/address', mockAddress, { method: 'POST' }); // @poFfastAddress
    await mockRoute('**/errands/*/facilities', mockMexErrand_base, { method: 'POST' });

    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMexErrand_base) });
    }); // @getErrandById
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' }); // @getJsonSchema
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' }, { method: 'GET' }); // @getUiSchema
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo
  });

  const visit = async (page, dismissCookieConsent) => {
    await page.goto('arende/PRH-2022-000019');
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const tab = page.locator('.sk-tabs-list button').nth(0);
    await expect(tab).toHaveText('Grunduppgifter');
    await tab.click({ force: true });
  };

  test('shows the correct base errand information', async ({ page, dismissCookieConsent }) => {
    const channel = Channels[mockMexErrand_base.data.channel as keyof typeof Channels];
    const applicant = mockMexErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.APPLICANT));
    const contact = mockMexErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.CONTACT_PERSON));
    await visit(page, dismissCookieConsent);

    // Errand info fields in page header
    await expect(page.locator('[data-cy="errandStatusLabel"]').getByText('Ärendestatus')).toBeVisible();
    const latestStatus = latestBy(mockMexErrand_base.data.statuses, 'dateTime').statusType;
    await expect(page.locator('[data-cy="errandStatus"]').getByText(latestStatus)).toBeVisible();
    await expect(page.locator('[data-cy="errandPriorityLabel"]').getByText('Prioritet')).toBeVisible();
    await expect(page.locator('[data-cy="errandPriority"]')).toBeVisible();
    await expect(page.locator('[data-cy="errandRegisteredLabel"]').getByText('Registrerat')).toBeVisible();
    await expect(
      page.locator('[data-cy="errandRegistered"]').getByText(dayjs(mockMexErrand_base.data.created).format('YYYY-MM-DD HH:mm'))
    ).toBeVisible();
    await expect(page.locator('[data-cy="errandStakeholderLabel"]').getByText('Ärendeägare')).toBeVisible();
    await expect(
      page.locator('[data-cy="errandStakeholder"]').getByText(`${applicant?.firstName} ${applicant?.lastName}`)
    ).toBeVisible();

    // Fields in errand form
    await expect(page.locator('[data-cy="channel-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="channel-input"]')).toHaveValue(channel);
    await expect(page.locator('[data-cy="municipality-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="municipality-input"]').getByText('Sundsvall')).toBeVisible();
    await expect(page.locator('[data-cy="casetype-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="priority-input"]')).toBeVisible();

    await expect(page.locator('[data-cy="registered-applicants"]')).toBeVisible();
    const renderedApplicant = page.locator('[data-cy="registered-applicants"] [data-cy="rendered-APPLICANT"]');
    await expect(renderedApplicant.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${applicant?.firstName} ${applicant?.lastName}`
    );
    await expect(renderedApplicant.locator('[data-cy="stakeholder-ssn"]')).toContainText(`${applicant?.personalNumber}`);
    await expect(renderedApplicant.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${applicant?.addresses[0].street} ${applicant?.addresses[0].postalCode} ${applicant?.addresses[0].city}`
    );

    await expect(page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${contact?.firstName} ${contact?.lastName}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(`${contact?.personalNumber}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact?.addresses[0].street} ${contact?.addresses[0].postalCode} ${contact?.addresses[0].city}`
    );
  });

  test('disables errand information and contact person edit menu when errand status is ArandeAvslutat', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute(
      '**/errand/errandNumber/*',
      modifyField(mockMexErrand_base, {
        status: {
          statusType: ErrandStatus.ArendeAvslutat,
          description: '',
          dateTime: '2024-10-14T09:17:52.067+02:00',
        },
        statuses: [
          {
            statusType: ErrandStatus.ArendeAvslutat,
            description: '',
            dateTime: '2024-10-14T09:17:52.067+02:00',
          },
        ],
      }),
      { method: 'GET' }
    ); // @getErrand
    await mockRoute('**/errands/*/decisions/*', { data: 'ok', message: 'ok' }, { method: 'PUT' }); // @putDecision
    await mockRoute('**/errands/*/decisions', { data: 'ok', message: 'ok' }, { method: 'PATCH' }); // @patchDecision
    await mockRoute('**/render/pdf', { data: 'ok', message: 'ok' }, { method: 'POST' }); // @pdfPreview
    await visit(page, dismissCookieConsent);
    await page.getByRole('tab', { name: 'Grunduppgifter' }).click();

    await expect(page.locator('[data-cy="casetype-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="priority-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="channel-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="municipality-input"]')).toBeDisabled();

    await expect(page.locator('[data-cy="save-and-continue-button"]')).toBeDisabled();
    await expect(page.locator('[data-cy="save-button"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="close-button"]')).not.toBeVisible();
  });

  test('shows error message on invalid person number', async ({ page, mockRoute, dismissCookieConsent, env }) => {
    mockMexErrand_base.data.stakeholders = [
      {
        id: 2103,
        version: 1,
        personalNumber: env.mockPersonNumber,
        created: '2024-05-21T11:04:18.753613+02:00',
        updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON',
        firstName: 'My',
        lastName: 'Testsson',
        adAccount: 'kctest',
        roles: ['ADMINISTRATOR'],
        addresses: [],
        address: { streetAddress: '' },
        contactInformation: [],
        extraParameters: {},
      },
    ];
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await visit(page, dismissCookieConsent);
    // Owner
    await page.locator('[data-cy="contact-personalNumber-owner"]').clear();
    await page.locator('[data-cy="contact-personalNumber-owner"]').fill(env.mockInvalidPersonNumber);

    await page.locator('[data-cy="contact-personalNumber-owner"]').clear();
    await page.locator('[data-cy="contact-personalNumber-owner"]').fill(env.mockInvalidPersonNumber);
    await expect(page.locator('[data-cy="personal-number-error-message"]')).toBeVisible();
    await expect(page.locator('[data-cy="personal-number-error-message"]')).toContainText(invalidSsnMessage);

    await page.locator('[data-cy="contact-personalNumber-owner"]').clear();
    await page.locator('[data-cy="contact-personalNumber-owner"]').fill(env.mockPersonNumber);
    await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();

    // Intressent
    await page.locator('[data-cy="contact-personalNumber-person"]').clear();
    await page.locator('[data-cy="contact-personalNumber-person"]').fill(env.mockInvalidPersonNumber);
    await expect(page.locator('[data-cy="contact-form"] button')).toBeVisible();

    await page.locator('[data-cy="contact-personalNumber-person"]').clear();
    await page.locator('[data-cy="contact-personalNumber-person"]').fill(env.mockInvalidPersonNumber);
    await expect(page.locator('[data-cy="personal-number-error-message"]')).toBeVisible();
    await expect(page.locator('[data-cy="personal-number-error-message"]')).toContainText(invalidSsnMessage);

    await page.locator('[data-cy="contact-personalNumber-person"]').clear();
    await page.locator('[data-cy="contact-personalNumber-person"]').fill(env.mockPersonNumber);
    await expect(page.locator('[data-cy="personal-number-error-message"]')).not.toBeVisible();
  });

  test('shows "not found" error message on non-existing person number', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/address', { message: 'Not found' }, { method: 'POST' }); // @notFoundAddress
    await visit(page, dismissCookieConsent);
    await page.waitForTimeout(500);

    await expect(page.locator('[data-cy="contact-personalNumber-person"]')).toBeEnabled();
    await page.locator('[data-cy="contact-personalNumber-person"]').clear();
    await page.locator('[data-cy="contact-personalNumber-person"]').fill(env.mockPersonNumber);
    await expect(page.getByText('Lägg till manuellt')).toBeVisible();
    await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();
    await page.waitForResponse((resp) => resp.url().includes('/address') && resp.status() === 200);
    await expect(page.locator('[data-cy="not-found-error-message"]')).toBeVisible();
    await expect(page.locator('[data-cy="not-found-error-message"]')).toContainText('Sökningen gav ingen träff');
  });

  test('shows error message on invalid org number', async ({ page, mockRoute, dismissCookieConsent, env }) => {
    mockMexErrand_base.data.stakeholders = [
      {
        id: 2103,
        version: 1,
        personalNumber: env.mockPersonNumber,
        created: '2024-05-21T11:04:18.753613+02:00',
        updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON',
        firstName: 'My',
        lastName: 'Testsson',
        adAccount: 'kctest',
        roles: ['ADMINISTRATOR'],
        addresses: [],
        address: { streetAddress: '' },
        contactInformation: [],
        extraParameters: {},
      },
    ];
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await visit(page, dismissCookieConsent);

    await page.locator('[data-cy="search-enterprise-owner-form"]').click();
    await page.locator('[data-cy="search-enterprise-owner-form"]').click();
    await page.locator('[data-cy="contact-personalNumber-owner"]').clear();
    await page.locator('[data-cy="contact-personalNumber-owner"]').fill(env.mockInvalidOrganizationNumber);
    await expect(page.locator('[data-cy="org-number-error-message-owner"]')).toBeVisible();
    await expect(page.locator('[data-cy="org-number-error-message-owner"]')).toContainText(invalidOrgNumberMessage);

    await page.locator('[data-cy="search-enterprise-person-form"]').click();
    await page.locator('[data-cy="contact-personalNumber-person"]').clear();
    await page.locator('[data-cy="contact-personalNumber-person"]').fill(env.mockInvalidOrganizationNumber);
    await expect(page.locator('[data-cy="org-number-error-message-person"]')).toBeVisible();
    await expect(page.locator('[data-cy="org-number-error-message-person"]')).toContainText(invalidOrgNumberMessage);

    await page.locator('[data-cy="contact-personalNumber-person"]').clear();
    await page.locator('[data-cy="contact-personalNumber-person"]').fill(env.mockOrganizationNumber);
    await expect(page.locator('[data-cy="org-number-error-message-person"]')).not.toBeVisible();
  });

  test('saves the correct errand information', async ({ page, mockRoute, env }) => {
    mockMexErrand_base.data.stakeholders = [
      {
        id: 2103,
        version: 1,
        personalNumber: env.mockPersonNumber,
        created: '2024-05-21T11:04:18.753613+02:00',
        updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON',
        firstName: 'My',
        lastName: 'Testsson',
        adAccount: 'kctest',
        roles: ['ADMINISTRATOR'],
        addresses: [],
        address: { streetAddress: '' },
        contactInformation: [],
        extraParameters: {},
      },
    ];
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/errand/101/messages', mockMessages, { method: 'GET' });
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/address', mockAddress, { method: 'POST' }); // @postAddress
    await mockRoute('**/organization', mockOrganization, { method: 'POST' }); // @postOrganization
    await page.goto('arende/PRH-2022-000019');
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);

    await page.locator('.sk-cookie-consent-btn-wrapper').getByText('Godkänn alla').click();
    const tab = page.locator('.sk-tabs-list button').nth(0);
    await expect(tab).toHaveText('Grunduppgifter');
    await tab.click({ force: true });

    // Save button disabled when no changes
    await expect(page.locator('[data-cy="save-and-continue-button"]')).toBeDisabled();

    await expect(page.locator('[data-cy="channel-input"]')).toBeDisabled();
    await page.locator('[data-cy="casetype-input"]').selectOption(CaseTypes.MEX.MEX_INVOICE);
    await page.locator('[data-cy="priority-input"]').selectOption('Hög');

    await page.locator('[data-cy="save-and-continue-button"]').click();
    const saveExtraParamsResponse = await page.waitForRequest(
      (req) => req.url().includes('/extraparameters') && req.method() === 'PATCH'
    );
    const saveExtraParamsBody = saveExtraParamsResponse.postDataJSON();
    preventProcessExtraParameters(saveExtraParamsBody);
    expect(saveExtraParamsBody).toEqual([
      { key: 'dummyItem', values: ['dummyValue1', 'dummyValue2'] },
      { key: 'contractId', values: ['2024-01026'] },
      { key: 'propertyDesignation', values: ['Test property'] },
      { key: 'caseMeaning', values: [] },
      { key: 'invoiceNumber', values: [] },
      { key: 'invoiceRecipient', values: [] },
      { key: 'otherInformation', values: [] },
    ]);
    const patchErrandRequest = await page.waitForRequest(
      (req) => req.url().includes('/errands/') && req.method() === 'PATCH' && !req.url().includes('extraparameters')
    );
    const patchErrandBody = patchErrandRequest.postDataJSON();
    expect(patchErrandBody.id).toBe('101');
    expect(patchErrandBody.caseType).toBe(CaseTypes.MEX.MEX_INVOICE);
    expect(patchErrandBody.priority).toBe('HIGH');

    await expect(page.locator('[data-cy="save-and-continue-button"]')).toBeDisabled();
  });

  test('allows saving organization as owner', async ({ page, mockRoute, dismissCookieConsent, env }) => {
    mockMexErrand_base.data.stakeholders = [
      {
        id: 2075,
        version: 1,
        created: '2024-05-17T10:50:17.25221+02:00',
        updated: '2024-05-17T10:50:17.252221+02:00',
        type: 'PERSON',
        personalNumber: env.mockPersonNumber,
        firstName: 'My',
        lastName: 'Testsson',
        roles: ['ADMINISTRATOR', 'SELLER'],
        adAccount: 'kctest',
        addresses: [],
        address: { streetAddress: '' },
        contactInformation: [],
        extraParameters: {},
      },
    ];
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}/stakeholders`, mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/address', mockAddress, { method: 'POST' }); // @postAddress
    await mockRoute('**/organization', mockOrganization, { method: 'POST' }); // @postOrganization
    await mockRoute('**/errands/101/stakeholders/**', mockErrand_base, { method: 'DELETE' }); // @removeStakeholder
    await visit(page, dismissCookieConsent);

    await page.locator('[data-cy="search-enterprise-owner-form"]').click();
    await page.locator('[data-cy="search-enterprise-owner-form"]').click();
    await page.locator('[data-cy="contact-personalNumber-owner"]').fill(env.mockOrganizationNumber);
    await page.waitForTimeout(300);
    await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();

    await expect(page.locator('[data-cy="organization-search-result"]').locator('p').filter({ hasText: mockOrganization.data.name })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Lägg till ärendeägare' })).toBeDisabled();
    await page.locator('[data-cy="new-email-input"]').first().fill(env.mockEmail);
    await page.locator('[data-cy="add-new-email-button"]').first().click();

    await page.locator('[data-cy="newPhoneNumber"]').clear();
    await page.locator('[data-cy="newPhoneNumber"]').fill(env.mockPhoneNumber);
    await page.locator('[data-cy="newPhoneNumber-button"]').click();

    await page.locator('[data-cy="roll-select"]').selectOption('Säljare');
    await expect(page.getByRole('button', { name: 'Lägg till ärendeägare' })).toBeEnabled();
    await page.getByRole('button', { name: 'Lägg till ärendeägare' }).click();
  });

  test('allows adding email addresses and phone numbers', async ({ page, mockRoute, dismissCookieConsent, env }) => {
    mockMexErrand_base.data.stakeholders = [
      {
        id: 2103,
        version: 1,
        personalNumber: env.mockPersonNumber,
        created: '2024-05-21T11:04:18.753613+02:00',
        updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON',
        firstName: 'My',
        lastName: 'Testsson',
        adAccount: 'kctest',
        roles: ['ADMINISTRATOR'],
        addresses: [],
        address: { streetAddress: '' },
        contactInformation: [],
        extraParameters: {},
      },
    ];
    const email_1 = 'test1@example.com';
    const email_2 = 'test2@example.com';
    const phonenumber_1 = '+46701740635';
    const phonenumber_2 = '+46701740636';
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}/stakeholders`, mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await visit(page, dismissCookieConsent);

    // Add a stakeholder
    await page.locator('[data-cy="contact-personalNumber-owner"]').clear();
    await page.locator('[data-cy="contact-personalNumber-owner"]').fill(env.mockPersonNumber);
    await page.locator('[data-cy="contact-form"] button').filter({ hasText: 'Sök' }).click();

    // Add email and remove it
    await page.locator('[data-cy="new-email-input"]').first().fill(email_1);
    await page.locator('[data-cy="add-new-email-button"]').first().click();
    await expect(page.locator('[data-cy="email-tag-0"]')).toBeVisible();
    await page.locator('[data-cy="email-tag-0"]').click();
    await expect(page.locator('[data-cy="email-tag-0"]')).not.toBeVisible();

    // Add phone and remove it
    await page.locator('[data-cy="newPhoneNumber"]').clear();
    await page.locator('[data-cy="newPhoneNumber"]').fill(phonenumber_1);
    await page.locator('[data-cy="newPhoneNumber-button"]').click();
    await expect(page.locator('[data-cy="phone-tag-0"]')).toBeVisible();
    await page.locator('[data-cy="phone-tag-0"]').click();
    await expect(page.locator('[data-cy="phone-tag-0"]')).not.toBeVisible();

    // Add two emails and two phones and save errand
    await page.locator('[data-cy="new-email-input"]').first().fill(email_1);
    await page.locator('[data-cy="add-new-email-button"]').first().click();
    await page.locator('[data-cy="new-email-input"]').first().fill(email_2);
    await page.locator('[data-cy="add-new-email-button"]').first().click();

    await page.locator('[data-cy="newPhoneNumber"]').clear();
    await page.locator('[data-cy="newPhoneNumber"]').fill(phonenumber_1);
    await page.locator('[data-cy="newPhoneNumber-button"]').click();
    await page.locator('[data-cy="newPhoneNumber"]').clear();
    await page.locator('[data-cy="newPhoneNumber"]').fill(phonenumber_2);
    await page.locator('[data-cy="newPhoneNumber-button"]').click();

    await page.locator('[data-cy="roll-select"]').selectOption('Säljare');

    await page.getByRole('button', { name: 'Lägg till ärendeägare' }).click();
    await page.locator('[data-cy="save-and-continue-button"]').click();
    const saveExtraParamsRequest = await page.waitForRequest(
      (req) => req.url().includes('/extraparameters') && req.method() === 'PATCH'
    );
    preventProcessExtraParameters(saveExtraParamsRequest.postDataJSON());

    const patchErrandRequest = await page.waitForRequest(
      (req) => req.url().includes('/errands/') && req.method() === 'PATCH' && !req.url().includes('extraparameters')
    );
    const patchBody = patchErrandRequest.postDataJSON();
    const requestApplicant = patchBody.stakeholders.find((s: any) => s.roles.includes('APPLICANT'));
    expect(requestApplicant.contactInformation[0].contactType).toBe('PHONE');
    expect(requestApplicant.contactInformation[0].value).toBe(phonenumber_1);
    expect(requestApplicant.contactInformation[1].contactType).toBe('PHONE');
    expect(requestApplicant.contactInformation[1].value).toBe(phonenumber_2);
    expect(requestApplicant.contactInformation[2].contactType).toBe('EMAIL');
    expect(requestApplicant.contactInformation[2].value).toBe(email_1);
    expect(requestApplicant.contactInformation[3].contactType).toBe('EMAIL');
    expect(requestApplicant.contactInformation[3].value).toBe(email_2);
  });

  test('allows editing all fields on an existing contact person if errand was created in web UI', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    const res = mockMexErrand_base;
    const contact = [
      {
        id: 667, version: 81, created: '2022-10-11T12:13:29.226233+02:00', updated: '2022-10-14T10:38:05.529007+02:00',
        extraParameters: { relation: '', extraInformation: 'Extra information' },
        personalNumber: env.mockPersonNumber, adAccount: 'kctest', type: 'PERSON',
        firstName: 'Kim', lastName: 'Testsson', personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        roles: ['CONTACT_PERSON', 'SELLER'],
        addresses: [{ street: 'Testvägen 4', postalCode: '123 34', city: 'SUNDSVALL', careOf: '' }],
        address: { streetAddress: '' }, contactInformation: [],
      },
      {
        id: 2103, version: 1, created: '2024-05-21T11:04:18.753613+02:00', updated: '2024-05-21T11:04:18.753618+02:00',
        personalNumber: env.mockPersonNumber, adAccount: 'kctest', type: 'PERSON',
        firstName: 'My', lastName: 'Testsson', roles: ['ADMINISTRATOR'],
        addresses: [], address: { streetAddress: '' }, contactInformation: [], extraParameters: {},
      },
    ] as any;
    res.data.stakeholders = contact;
    await mockRoute('**/errand/errandNumber/*', res, { method: 'GET' }); // @getErrand
    await mockRoute(
      `**/errands/${mockMexErrand_base.data.id}/stakeholders/${contact[0].id}`,
      mockMexErrand_base,
      { method: 'PATCH' }
    ); // @patchStakeholder
    await visit(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(`${contact[0].firstName} ${contact[0].lastName}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(`${contact[0].personalNumber}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
    );

    await page.getByRole('button', { name: 'Redigera uppgifter' }).click();

    await expect(page.locator('[data-cy="roll-select"]')).toHaveValue('SELLER');
    await expect(page.locator('[data-cy="contact-firstName"]')).toHaveValue(contact[0].firstName);
    await expect(page.locator('[data-cy="contact-lastName"]')).toHaveValue(contact[0].lastName);
    await page.locator('[data-cy="contact-street"]').clear();
    await page.locator('[data-cy="contact-street"]').fill('Testgata');
    await page.locator('[data-cy="contact-zip"]').clear();
    await page.locator('[data-cy="contact-zip"]').fill('12345');
    await page.locator('[data-cy="contact-city"]').clear();
    await page.locator('[data-cy="contact-city"]').fill('Teststaden');
    await page.locator('[data-cy="contact-extrainfo"]').clear();
    await page.locator('[data-cy="contact-extrainfo"]').fill('Some information');

    await page.locator('[data-cy="new-email-input"]').first().fill('test@example.com');
    await page.locator('[data-cy="add-new-email-button"]').first().click();
    await page.locator('[data-cy="newPhoneNumber"]').clear();
    await page.locator('[data-cy="newPhoneNumber"]').fill('+46701740635');
    await page.locator('[data-cy="newPhoneNumber-button"]').click();

    await page.getByRole('button', { name: 'Ändra uppgifter' }).click();
    await page.locator('[data-cy="save-and-continue-button"]').click();

    const patchStakeholderRequest = await page.waitForRequest(
      (req) => req.url().includes(`/stakeholders/${contact[0].id}`) && req.method() === 'PATCH'
    );
    const requestStakeholder = patchStakeholderRequest.postDataJSON();
    expect(requestStakeholder.firstName).toBe(contact[0].firstName);
    expect(requestStakeholder.lastName).toBe(contact[0].lastName);
    expect(requestStakeholder.addresses[0].street).toBe('Testgata');
    expect(requestStakeholder.addresses[0].postalCode).toBe('12345');
    expect(requestStakeholder.addresses[0].city).toBe('Teststaden');
    expect(requestStakeholder.contactInformation[0].contactType).toBe('PHONE');
    expect(requestStakeholder.contactInformation[0].value).toBe('+46701740635');
    expect(requestStakeholder.contactInformation[1].contactType).toBe('EMAIL');
    expect(requestStakeholder.contactInformation[1].value).toBe('test@example.com');
  });

  test('makes readOnly firstName and lastName field when editing person stakeholders on errands not created in web UI', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    const res = mockMexErrand_base;
    res.data.channel = Channels.ESERVICE;
    const contact = [
      {
        id: 667, version: 81, created: '2022-10-11T12:13:29.226233+02:00', updated: '2022-10-14T10:38:05.529007+02:00',
        extraParameters: { relation: 'Bror', extraInformation: 'Extra information' },
        type: 'PERSON', personalNumber: env.mockPersonNumber, adAccount: 'kctest',
        firstName: 'Kim', lastName: 'Testsson', personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        roles: ['CONTACT_PERSON'],
        addresses: [{ street: 'Testvägen 4', postalCode: '123 44', city: 'SUNDSVALL', careOf: '' }],
        address: { streetAddress: '' }, contactInformation: [],
      },
      {
        id: 2103, version: 1, personalNumber: env.mockPersonNumber, adAccount: 'kctest',
        created: '2024-05-21T11:04:18.753613+02:00', updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON', firstName: 'My', lastName: 'Testsson', roles: ['ADMINISTRATOR'],
        addresses: [], address: { streetAddress: '' }, contactInformation: [], extraParameters: {},
      },
    ] as any;
    res.data.stakeholders = contact;
    await mockRoute('**/errand/errandNumber/*', res, { method: 'GET' }); // @getErrand
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await visit(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(`${contact[0].firstName} ${contact[0].lastName}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(`${contact[0].personalNumber}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
    );

    await page.getByRole('button', { name: 'Redigera uppgifter' }).click();

    await expect(page.locator('[data-cy="contact-manual-toggle"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="contact-personalNumber"]')).toHaveAttribute('readonly', 'readonly');
    await expect(page.locator('[data-cy="contact-firstName"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-firstName"]')).toHaveValue(contact[0].firstName);
    await expect(page.locator('[data-cy="contact-lastName"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-lastName"]')).toHaveValue(contact[0].lastName);
    await expect(page.locator('[data-cy="contact-street"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-street"]')).toHaveValue(contact[0].addresses[0].street);
    await expect(page.locator('[data-cy="contact-zip"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-zip"]')).toHaveValue(contact[0].addresses[0].postalCode);
    await expect(page.locator('[data-cy="contact-city"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-city"]')).toHaveValue(contact[0].addresses[0].city);
    await expect(page.locator('[data-cy="contact-extrainfo"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-extrainfo"]')).toHaveValue(contact[0].extraParameters.extraInformation);
  });

  test('makes readOnly orgName field when editing organization stakeholders on errands not created in web UI', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    const res = mockMexErrand_base;
    res.data.channel = Channels.ESERVICE;
    const contact = [
      {
        id: 667, version: 81, created: '2022-10-11T12:13:29.226233+02:00', updated: '2022-10-14T10:38:05.529007+02:00',
        extraParameters: { relation: 'Bror', extraInformation: 'Extra information' },
        type: 'ORGANIZATION', organizationName: 'Bolaget AB', organizationNumber: '112233-5555',
        firstName: '', lastName: '', personId: '', roles: ['CONTACT_PERSON'],
        addresses: [{ addressCategory: 'POSTAL', street: 'Testvägen 454', postalCode: '123 34', city: 'SUNDSVALL', careOf: '' }],
        address: { streetAddress: '' }, contactInformation: [], personalNumber: '',
      },
      {
        id: 2103, version: 1, personalNumber: env.mockPersonNumber, adAccount: 'kctest',
        created: '2024-05-21T11:04:18.753613+02:00', updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON', firstName: 'My', lastName: 'Testsson', roles: ['ADMINISTRATOR'],
        addresses: [], address: { streetAddress: '' }, contactInformation: [], extraParameters: {},
      },
    ];
    res.data.stakeholders = contact;
    await mockRoute('**/errand/errandNumber/*', res, { method: 'GET' }); // @getErrand
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await visit(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(contact[0].personalNumber);
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(contact[0].organizationName);

    await page.getByRole('button', { name: 'Redigera uppgifter' }).click();

    await expect(page.locator('[data-cy="contact-manual-toggle"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="contact-organizationName"]')).toHaveAttribute('readonly', 'readonly');
    await expect(page.locator('[data-cy="contact-firstName"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="contact-lastName"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="contact-street"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-street"]')).toHaveValue(contact[0].addresses[0].street);
    await expect(page.locator('[data-cy="contact-zip"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-zip"]')).toHaveValue(contact[0].addresses[0].postalCode);
    await expect(page.locator('[data-cy="contact-city"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-city"]')).toHaveValue(contact[0].addresses[0].city);
    await expect(page.locator('[data-cy="contact-extrainfo"]')).toBeEnabled();
    await expect(page.locator('[data-cy="contact-extrainfo"]')).toHaveValue(contact[0].extraParameters.extraInformation);
  });

  test('allows converting an existing stakeholder from contact person to owner', async ({
    page,
    mockRoute,
    dismissCookieConsent,
    env,
  }) => {
    const res = mockMexErrand_base;
    const contact = [
      {
        id: 667, version: 81, created: '2022-10-11T12:13:29.226233+02:00', updated: '2022-10-14T10:38:05.529007+02:00',
        extraParameters: { relation: '' }, type: 'PERSON',
        firstName: 'Kim', lastName: 'Testarsson', personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        roles: ['CONTACT_PERSON'],
        addresses: [{ street: 'Testvägen 4', postalCode: '123 34', city: 'SUNDSVALL', careOf: '' }],
        address: { streetAddress: '' }, contactInformation: [],
        personalNumber: env.mockPersonNumber, adAccount: 'kctest',
      },
      {
        id: 2103, version: 1, personalNumber: env.mockPersonNumber, adAccount: 'kctest',
        created: '2024-05-21T11:04:18.753613+02:00', updated: '2024-05-21T11:04:18.753618+02:00',
        type: 'PERSON', firstName: 'My', lastName: 'Testsson', roles: ['ADMINISTRATOR'],
        addresses: [], address: { streetAddress: '' }, contactInformation: [], extraParameters: {},
      },
    ] as any;
    res.data.stakeholders = contact;
    await mockRoute('**/errand/errandNumber/*', res, { method: 'GET' }); // @getErrand
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base, { method: 'PATCH' }); // @patchErrand
    await mockRoute(`**/errands/${mockMexErrand_base.data.id}/stakeholders/${contact[0].id}`, {}, { method: 'PATCH' }); // @patchStakeholder
    await visit(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(`${contact[0].firstName} ${contact[0].lastName}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(`${contact[0].personalNumber}`);
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
    );

    await page.getByRole('button', { name: 'Gör till ärendeägare' }).click();
    await page.getByRole('button', { name: 'Ja' }).click();
    await page.locator('[data-cy="save-and-continue-button"]').click();

    const patchStakeholderRequest = await page.waitForRequest(
      (req) => req.url().includes(`/stakeholders/${contact[0].id}`) && req.method() === 'PATCH'
    );
    const body = patchStakeholderRequest.postDataJSON();
    expect(body.roles[0]).toBe('APPLICANT');
  });
});
