import { CaseLabels } from '@casedata/interfaces/case-label';
import { Channels } from '@casedata/interfaces/channels';
import { Role } from '@casedata/interfaces/role';
import { StakeholderType } from '@casedata/interfaces/stakeholder';
import { latestBy } from '@common/services/helper-service';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAttachmentsPT } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import dayjs from 'dayjs';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { MOCK_PERSON_NUMBER } from '../fixtures/mockMexErrand';
import { mockPermits } from '../fixtures/mockPermits';
import { mockRelations } from '../fixtures/mockRelations';
import { test, expect } from '../../fixtures/base.fixture';

test.describe('Errand page', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/messages/*', mockMessages);
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/parking-permits/', mockPermits);
    await mockRoute('**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
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
        body: JSON.stringify(mockAttachmentsPT),
      });
    });
    await mockRoute('**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
    await mockRoute('**/assets?**', {});
    await mockRoute('**/errands/*/history', mockHistory);
    await mockRoute('**/address', mockAddress, { method: 'POST' });

    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await mockRoute('**/contracts/2024-01026', mockPTErrand_base);

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
    await mockRoute('**/errands/**/extraparameters', {}, { method: 'PATCH' });
  });

  const visit = async (page: import('@playwright/test').Page, dismissCookieConsent: () => Promise<void>) => {
    await page.goto('arende/PRH-2022-000019');
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const baseInfoTab = page.locator('.sk-tabs-list button').nth(0);
    await expect(baseInfoTab).toHaveText('Grunduppgifter');
    await baseInfoTab.click({ force: true });
  };

  test('shows the correct base errand information', async ({ page, dismissCookieConsent }) => {
    const caseLabel = CaseLabels.ALL[mockPTErrand_base.data.caseType as keyof typeof CaseLabels.ALL];
    const priority: string = mockPTErrand_base.data.priority;
    const channel = Channels[mockPTErrand_base.data.channel as keyof typeof Channels];
    const applicant = mockPTErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.APPLICANT));
    const contact = mockPTErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.CONTACT_PERSON));
    await visit(page, dismissCookieConsent);

    // Errand info fields in page header
    await expect(page.locator('[data-cy="errandStatusLabel"]')).toContainText('Ärendestatus');
    const latestStatus = latestBy(mockPTErrand_base.data.statuses, 'dateTime').statusType;
    await expect(page.locator('[data-cy="errandStatus"]')).toContainText(latestStatus);
    await expect(page.locator('[data-cy="errandRegisteredLabel"]')).toContainText('Registrerat');
    await expect(page.locator('[data-cy="errandRegistered"]')).toContainText(
      dayjs(mockPTErrand_base.data.created).format('YYYY-MM-DD HH:mm')
    );
    await expect(page.locator('[data-cy="errandStakeholderLabel"]')).toContainText('Ärendeägare');
    await expect(page.locator('[data-cy="errandStakeholder"]')).toContainText(
      `${applicant?.firstName} ${applicant?.lastName}`
    );
    await expect(page.locator('[data-cy="errandPersonalNumberLabel"]')).toContainText('Personnummer');
    await expect(page.locator('[data-cy="errandPersonalNumber"]')).toContainText(applicant?.personalNumber!);

    // Fields in errand form
    await expect(page.locator('[data-cy="channel-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="channel-input"]')).toHaveValue(channel);
    await expect(page.locator('[data-cy="municipality-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="municipality-input"]')).toContainText('Sundsvall');
    await expect(page.locator('[data-cy="casetype-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="casetype-input"]')).toContainText(caseLabel);
    await expect(page.locator('[data-cy="priority-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="priority-input"]')).toContainText(priority as string);

    await expect(page.locator('[data-cy="registered-applicants"]')).toBeVisible();
    const renderedApplicant = page.locator('[data-cy="registered-applicants"] [data-cy="rendered-APPLICANT"]');
    await expect(renderedApplicant.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${applicant?.firstName} ${applicant?.lastName}`
    );
    await expect(renderedApplicant.locator('[data-cy="stakeholder-ssn"]')).toContainText(
      `${applicant?.personalNumber}`
    );
    await expect(renderedApplicant.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${applicant?.addresses?.[0].street} ${applicant?.addresses?.[0].postalCode} ${applicant?.addresses?.[0].city}`
    );
    await expect(renderedApplicant.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${applicant?.firstName} ${applicant?.lastName}`
    );

    await expect(
      page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')
    ).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${contact?.firstName} ${contact?.lastName}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(
      `${contact?.personalNumber}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact?.addresses?.[0].street} ${contact?.addresses?.[0].postalCode} ${contact?.addresses?.[0].city}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${contact?.firstName} ${contact?.lastName}`
    );
  });

  test('search organization as stakeholder should not be showing', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await visit(page, dismissCookieConsent);
    await expect(page.locator('[data-cy="search-enterprise-owner-form"]')).not.toBeVisible();
  });

  test('allows editing all fields on an existing contact person if errand was created in web UI', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const res = { ...mockPTErrand_base, data: { ...mockPTErrand_base.data } };
    const contact = [
      {
        id: '667',
        version: 81,
        created: '2022-10-11T12:13:29.226233+02:00',
        updated: '2022-10-14T10:38:05.529007+02:00',
        extraParameters: {},
        adAccount: 'kctest',
        type: 'PERSON' as StakeholderType,
        firstName: 'Kim',
        lastName: 'Testson',
        personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        personalNumber: MOCK_PERSON_NUMBER,
        roles: [Role.CONTACT_PERSON, Role.DRIVER],
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS' as any,
            apartmentNumber: '' as any,
            street: 'Testvägen 4',
            postalCode: '123 85',
            city: 'SUNDSVALL',
            careOf: '',
          },
        ],
        contactInformation: [],
      },
      {
        id: '2103',
        version: 1,
        created: '2024-05-21T11:04:18.753613+02:00',
        updated: '2024-05-21T11:04:18.753618+02:00',
        adAccount: 'kctest',
        personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        personalNumber: MOCK_PERSON_NUMBER,
        type: 'PERSON' as StakeholderType,
        firstName: 'My',
        lastName: 'Testsson',
        roles: [Role.ADMINISTRATOR],
        addresses: [],
        contactInformation: [],
        extraParameters: {} as any,
      },
    ];
    res.data.stakeholders = contact;
    await mockRoute('**/errand/errandNumber/*', res);
    await mockRoute(
      `**/errands/${mockPTErrand_base.data.id}/stakeholders/${contact[0].id}`,
      mockPTErrand_base,
      { method: 'PATCH' }
    );
    await page.goto('arende/PRH-2022-000019');
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);

    await dismissCookieConsent();
    const baseInfoTab = page.locator('.sk-tabs-list button').nth(0);
    await expect(baseInfoTab).toHaveText('Grunduppgifter');
    await baseInfoTab.click({ force: true });
    await expect(
      page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]')
    ).toBeVisible();
    const renderedContact = page.locator('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${contact[0].firstName} ${contact[0].lastName}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-ssn"]')).toContainText(
      `${contact[0].personalNumber}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-adress"]')).toContainText(
      `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
    );
    await expect(renderedContact.locator('[data-cy="stakeholder-name"]')).toContainText(
      `${contact[0].firstName} ${contact[0].lastName}`
    );

    await page.getByText('Redigera uppgifter').click();

    await expect(page.locator('[data-cy="roll-select"]')).toHaveValue('DRIVER');
    await expect(page.locator('[data-cy="contact-firstName"]')).toHaveValue(contact[0].firstName);
    await expect(page.locator('[data-cy="contact-lastName"]')).toHaveValue(contact[0].lastName);
    await page.locator('[data-cy="contact-street"]').clear();
    await page.locator('[data-cy="contact-street"]').fill('Testgata');
    await page.locator('[data-cy="contact-zip"]').clear();
    await page.locator('[data-cy="contact-zip"]').fill('12345');
    await page.locator('[data-cy="contact-city"]').clear();
    await page.locator('[data-cy="contact-city"]').fill('Teststaden');

    await page.locator('[data-cy="new-email-input"]').first().fill('test@example.com');
    await page.locator('[data-cy="add-new-email-button"]').first().click();
    await page.locator('[data-cy="newPhoneNumber"]').clear();
    await page.locator('[data-cy="newPhoneNumber"]').fill('+46701740635');
    await page.locator('[data-cy="newPhoneNumber-button"]').click();

    await page.getByText('Ändra uppgifter').click();
    await page.locator('[data-cy="save-and-continue-button"]').click();

    const patchRequest = await page.waitForRequest(
      (req) =>
        req.url().includes(`/errands/${mockPTErrand_base.data.id}/stakeholders/${contact[0].id}`) &&
        req.method() === 'PATCH'
    );
    const body = patchRequest.postDataJSON();
    expect(body.firstName).toBe(contact[0].firstName);
    expect(body.lastName).toBe(contact[0].lastName);
    expect(body.addresses[0].street).toBe('Testgata');
    expect(body.addresses[0].postalCode).toBe('12345');
    expect(body.addresses[0].city).toBe('Teststaden');
    expect(body.contactInformation[0].contactType).toBe('PHONE');
    expect(body.contactInformation[0].value).toBe('+46701740635');
    expect(body.contactInformation[1].contactType).toBe('EMAIL');
    expect(body.contactInformation[1].value).toBe('test@example.com');
  });
});
