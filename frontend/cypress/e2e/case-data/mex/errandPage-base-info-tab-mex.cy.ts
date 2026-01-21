/// <reference types="cypress" />

import { CaseTypes } from '@casedata/interfaces/case-type';
import { Channels } from '@casedata/interfaces/channels';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Role } from '@casedata/interfaces/role';
import { invalidOrgNumberMessage, invalidSsnMessage, latestBy } from '@common/services/helper-service';
import { onlyOn } from '@cypress/skip-test';
import { mockAddress } from 'cypress/e2e/case-data/fixtures/mockAddress';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockErrand_base } from 'cypress/e2e/case-data/fixtures/mockErrand';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockOrganization } from 'cypress/e2e/case-data/fixtures/mockOrganization';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
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

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  const visit = () => {
    cy.visit('/arende/2281/PRH-2022-000019');
    cy.wait('@getErrand');

    cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    cy.get('.sk-tabs-list button').eq(0).should('have.text', `Grunduppgifter`).click({ force: true });
  };
  describe('Errand page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/metadata/jsonschemas/*/latest', { data: { id: 'mock-schema-id', schema: {} } });
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', '**/errand/101/messages', mockMessages);
      cy.intercept('GET', /\/errand\/\d*\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', '**/contract/2024-01026', mockPurchaseAgreement).as('getContract');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('PATCH', '**/errands/101', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('PATCH', '**/errands/**/extraparameters', { data: [], message: 'ok' }).as('saveExtraParameters');

      cy.intercept('GET', '**/contracts/2024-01026', mockLeaseAgreement).as('getContract');
      cy.intercept('GET', '**/contracts/2281/2024-01026/attachments/1', mockContractAttachment).as(
        'getContractAttachment'
      );

      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/assets**', mockAsset).as('getAssets');

      cy.intercept('POST', '**/address', mockAddress).as('poFfastAddress');
      cy.intercept('POST', '**/errands/*/facilities', mockMexErrand_base);

      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/errand/*', mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');
      cy.intercept('GET', '**/estateInfo/**1:1', mockEstateInfo11).as('getEstateInfo');
      cy.intercept('GET', '**/estateInfo/**1:2', mockEstateInfo12).as('getEstateInfo');
    });

    it('shows the correct base errand information', () => {
      const channel = Channels[mockMexErrand_base.data.channel as keyof typeof Channels];
      const applicant = mockMexErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.APPLICANT));
      const contact = mockMexErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.CONTACT_PERSON));
      visit();

      // Errand info fields in page header
      cy.get('[data-cy="errandStatusLabel"]').contains('Ärendestatus').should('exist');
      const latestStatus = latestBy(mockMexErrand_base.data.statuses, 'dateTime').statusType;
      cy.get('[data-cy="errandStatus"]').contains(latestStatus).should('exist');
      cy.get('[data-cy="errandPriorityLabel"]').contains('Prioritet').should('exist');
      cy.get('[data-cy="errandPriority"]').should('exist');
      cy.get('[data-cy="errandRegisteredLabel"]').contains('Registrerat').should('exist');
      cy.get('[data-cy="errandRegistered"]')
        .contains(dayjs(mockMexErrand_base.data.created).format('YYYY-MM-DD HH:mm'))
        .should('exist');
      cy.get('[data-cy="errandStakeholderLabel"]').contains('Ärendeägare').should('exist');
      cy.get('[data-cy="errandStakeholder"]')
        .contains(`${applicant?.firstName} ${applicant?.lastName}`)
        .should('exist');
      // Not in use right now
      // cy.get('[data-cy="errandPersonalNumberLabel"]').contains('Personnummer').should('exist');
      // cy.get('[data-cy="errandPersonalNumber"]').contains(applicant.personalNumber).should('exist');

      // Fields in errand form
      cy.get('[data-cy="channel-input"]').should('exist');
      cy.get('[data-cy="channel-input"]').should('have.value', channel);
      cy.get('[data-cy="municipality-input"]').should('exist');
      cy.get('[data-cy="municipality-input"]').children().contains('Sundsvall').should('exist');
      cy.get('[data-cy="casetype-input"]').should('exist');
      cy.get('[data-cy="priority-input"]').should('exist');

      cy.get('[data-cy="registered-applicants"]').should('exist');
      const renderedApplicant = cy.get('[data-cy="registered-applicants"] [data-cy="rendered-APPLICANT"]');
      renderedApplicant
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${applicant?.firstName} ${applicant?.lastName}`);
      renderedApplicant.get('[data-cy="stakeholder-ssn"]').should('contain', `${applicant?.personalNumber}`);
      renderedApplicant
        .get('[data-cy="stakeholder-adress"]')
        .should(
          'contain',
          `${applicant?.addresses[0].street} ${applicant?.addresses[0].postalCode} ${applicant?.addresses[0].city}`
        );
      renderedApplicant
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${applicant?.firstName} ${applicant?.lastName}`);

      cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]').should('exist');
      const renderedContact = cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact?.firstName} ${contact?.lastName}`);
      renderedContact.get('[data-cy="stakeholder-ssn"]').should('contain', `${contact?.personalNumber}`);
      renderedContact
        .get('[data-cy="stakeholder-adress"]')
        .should(
          'contain',
          `${contact?.addresses[0].street} ${contact?.addresses[0].postalCode} ${contact?.addresses[0].city}`
        );
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact?.firstName} ${contact?.lastName}`);
    });

    it('disables errand information and contact person edit menu when errand status is ArandeAvslutat', () => {
      cy.intercept(
        'GET',
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
        })
      ).as('getErrand');
      cy.intercept('PUT', '**/errands/*/decisions/*', { data: 'ok', message: 'ok' }).as('putDecision');
      cy.intercept('PATCH', '**/errands/*/decisions', { data: 'ok', message: 'ok' }).as('patchDecision');
      cy.intercept('POST', '**/render/pdf', { data: 'ok', message: 'ok' }).as('pdfPreview');
      visit();
      cy.get('button[role="tab"]').contains('Grunduppgifter').click();

      cy.get('[data-cy="casetype-input"]').should('be.disabled');
      cy.get('[data-cy="priority-input"]').should('be.disabled');
      cy.get('[data-cy="channel-input"]').should('be.disabled');
      cy.get('[data-cy="municipality-input"]').should('be.disabled');

      cy.get('[data-cy="save-and-continue-button"]').should('be.disabled');
      cy.get('[data-cy="save-button"]').should('not.exist');
      cy.get('[data-cy="close-button"]').should('not.exist');
    });

    it('shows error message on invalid person number', () => {
      mockMexErrand_base.data.stakeholders = [
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ];
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      visit();
      // Owner
      cy.get('[data-cy="contact-personalNumber-owner"]')
        .should('exist')
        .clear()
        .type(Cypress.env('mockInvalidPersonNumber'));

      cy.get('[data-cy="contact-personalNumber-owner"]').clear().type(Cypress.env('mockInvalidPersonNumber'));
      cy.get('[data-cy="personal-number-error-message"]').should('exist').should('contain.text', invalidSsnMessage);

      cy.get('[data-cy="contact-personalNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="personal-number-error-message"]').should('not.exist');

      // Intressent
      cy.get('[data-cy="contact-personalNumber-person"]')
        .should('exist')
        .clear()
        .type(Cypress.env('mockInvalidPersonNumber'));
      cy.get('[data-cy="contact-form"] button').should('exist');

      cy.get('[data-cy="contact-personalNumber-person"]').clear().type(Cypress.env('mockInvalidPersonNumber'));
      cy.get('[data-cy="personal-number-error-message"]').should('exist').should('contain.text', invalidSsnMessage);

      cy.get('[data-cy="contact-personalNumber-person"]').clear().type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="personal-number-error-message"]').should('not.exist');
    });

    it('shows "not found" error message on non-existing person number', () => {
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('POST', '**/address', { message: 'Not found' }).as('notFoundAddress');
      visit();
      cy.wait(500);

      cy.get('[data-cy="contact-personalNumber-person"]')
        .should('not.be.disabled')
        .clear()
        .should('contain.value', '')
        .type(Cypress.env('mockPersonNumber'));
      cy.get('button').contains('Lägg till manuellt').should('exist');
      cy.get('[data-cy="contact-form"] button').contains('Sök').click();
      cy.wait('@notFoundAddress');
      cy.get('[data-cy="not-found-error-message"]').should('exist').should('contain.text', 'Sökningen gav ingen träff');
    });

    it('shows error message on invalid org number', () => {
      mockMexErrand_base.data.stakeholders = [
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ];
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      visit();

      cy.get('[data-cy="search-enterprise-owner-form"]').click();
      cy.get('[data-cy="search-enterprise-owner-form"]').click();
      cy.get('[data-cy="contact-personalNumber-owner"]').clear().type(Cypress.env('mockInvalidOrganizationNumber'));
      cy.get('[data-cy="org-number-error-message-owner"]')
        .should('exist')
        .should('contain.text', invalidOrgNumberMessage);

      cy.get('[data-cy="search-enterprise-person-form"]').click();
      cy.get('[data-cy="contact-personalNumber-person"]').clear().type(Cypress.env('mockInvalidOrganizationNumber'));
      cy.get('[data-cy="org-number-error-message-person"]')
        .should('exist')
        .should('contain.text', invalidOrgNumberMessage);

      cy.get('[data-cy="contact-personalNumber-person"]').clear().type(Cypress.env('mockOrganizationNumber'));
      cy.get('[data-cy="org-number-error-message-person"]').should('not.exist');
    });

    it('saves the correct errand information', () => {
      mockMexErrand_base.data.stakeholders = [
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ];
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/errand/101/messages', mockMessages);
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base).as('patchErrand');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('POST', '**/organization', mockOrganization).as('postOrganization');
      cy.visit('/arende/2281/PRH-2022-000019');
      cy.wait('@getErrand');

      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(0).should('have.text', `Grunduppgifter`).click({ force: true });

      // Save button disabled when no changes
      cy.get('[data-cy="save-and-continue-button"]').should('be.disabled');

      cy.get('[data-cy="channel-input"]').should('be.disabled');
      cy.get('[data-cy="casetype-input"]').should('exist').select(CaseTypes.MEX.MEX_INVOICE);
      cy.get('[data-cy="priority-input"]').should('exist').select('Hög');

      cy.get('[data-cy="save-and-continue-button"]').should('exist').click();
      cy.wait('@saveExtraParameters').should(({ request }) => {
        preventProcessExtraParameters(request.body);
        expect(request.body).to.deep.equal([
          {
            key: 'dummyItem',
            values: ['dummyValue1', 'dummyValue2'],
          },
          {
            key: 'contractId',
            values: ['2024-01026'],
          },
          {
            key: 'propertyDesignation',
            values: ['Test property'],
          },
          {
            key: 'caseMeaning',
            values: [],
          },
          {
            key: 'invoiceNumber',
            values: [],
          },
          {
            key: 'invoiceRecipient',
            values: [],
          },
          {
            key: 'otherInformation',
            values: [],
          },
        ]);
      });
      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal('101');
        expect(request.body.caseType).to.equal(CaseTypes.MEX.MEX_INVOICE);
        expect(request.body.priority).to.equal('HIGH');
      });

      cy.get('[data-cy="save-and-continue-button"]').should('be.disabled');
    });

    it('allows saving organization as owner', () => {
      mockMexErrand_base.data.stakeholders = [
        {
          id: 2075,
          version: 1,
          created: '2024-05-17T10:50:17.25221+02:00',
          updated: '2024-05-17T10:50:17.252221+02:00',
          type: 'PERSON',
          personalNumber: Cypress.env('mockPersonNumber'),
          firstName: 'My',
          lastName: 'Testsson',
          roles: ['ADMINISTRATOR', 'SELLER'],
          adAccount: 'kctest',
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ];
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}/stakeholders`, mockMexErrand_base).as(
        'patchErrand'
      );
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('POST', '**/organization', mockOrganization).as('postOrganization');
      cy.intercept('DELETE', `**/errands/101/stakeholders/**`, mockErrand_base).as('removeStakeholder');
      visit();

      cy.get('[data-cy="search-enterprise-owner-form"]').should('exist').click();
      cy.get('[data-cy="search-enterprise-owner-form"]').should('exist').click();
      // cy.get('[data-cy="contact-orgNumber-owner"]').type('556677-8899');
      cy.get('[data-cy="contact-personalNumber-owner"]').type(Cypress.env('mockOrganizationNumber'));
      cy.wait(300);
      // cy.get('[data-cy="search-button-owner"]').click();
      cy.get('[data-cy="contact-form"] button').contains('Sök').click();

      cy.get('[data-cy="organization-search-result"]').find('p').contains(mockOrganization.data.name).should('exist');

      cy.get('button').contains('Lägg till ärendeägare').should('be.disabled');
      cy.get('[data-cy="new-email-input"]').first().type(Cypress.env('mockEmail'));
      cy.get('[data-cy="add-new-email-button"]').first().click();

      cy.get('[data-cy="newPhoneNumber"]').clear().type(Cypress.env('mockPhoneNumber'));
      cy.get('[data-cy="newPhoneNumber-button"]').click();

      cy.get('[data-cy="roll-select"]').select('Säljare');
      cy.get('button').contains('Lägg till ärendeägare').should('be.enabled').click();
    });

    it('allows adding email addresses and phone numbers', () => {
      mockMexErrand_base.data.stakeholders = [
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ];
      const email_1 = 'test1@example.com';
      const email_2 = 'test2@example.com';
      const phonenumber_1 = '+46701740635';
      const phonenumber_2 = '+46701740636';
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}/stakeholders`, mockMexErrand_base).as(
        'patchErrand'
      );
      visit();

      // Add a stakeholders
      cy.get('[data-cy="contact-personalNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
      // cy.get('[data-cy="search-button-owner"]').click();
      cy.get('[data-cy="contact-form"] button').contains('Sök').click();

      // Add email and remove it
      cy.get('[data-cy="new-email-input"]').first().type(email_1);
      cy.get('[data-cy="add-new-email-button"]').first().click();
      cy.get('[data-cy="email-tag-0"]').should('exist');
      cy.get('[data-cy="email-tag-0"]').click();
      cy.get('[data-cy="email-tag-0"]').should('not.exist');

      // Add phone and remove it
      cy.get('[data-cy="newPhoneNumber"]').clear().type(phonenumber_1);
      cy.get('[data-cy="newPhoneNumber-button"]').click();
      cy.get('[data-cy="phone-tag-0"]').should('exist');
      cy.get('[data-cy="phone-tag-0"]').click();
      cy.get('[data-cy="phone-tag-0"]').should('not.exist');

      // Add two emails and two phones and save errand
      cy.get('[data-cy="new-email-input"]').first().type(email_1);
      cy.get('[data-cy="add-new-email-button"]').first().click();
      cy.get('[data-cy="new-email-input"]').first().type(email_2);
      cy.get('[data-cy="add-new-email-button"]').first().click();

      cy.get('[data-cy="newPhoneNumber"]').clear().type(phonenumber_1);
      cy.get('[data-cy="newPhoneNumber-button"]').click();
      cy.get('[data-cy="newPhoneNumber"]').clear().type(phonenumber_2);
      cy.get('[data-cy="newPhoneNumber-button"]').click();

      cy.get('[data-cy="roll-select"]').select('Säljare');

      cy.get('button').contains('Lägg till ärendeägare').click();
      cy.get('[data-cy="save-and-continue-button"]').should('exist').click();
      cy.wait('@saveExtraParameters').should(({ request }) => {
        preventProcessExtraParameters(request.body);
      });
      cy.wait('@patchErrand').should(({ request }) => {
        const requestApplicant = request.body.stakeholders.find((s) => s.roles.includes('APPLICANT'));
        expect(requestApplicant.contactInformation[0].contactType).to.equal('PHONE');
        expect(requestApplicant.contactInformation[0].value).to.equal(phonenumber_1);
        expect(requestApplicant.contactInformation[1].contactType).to.equal('PHONE');
        expect(requestApplicant.contactInformation[1].value).to.equal(phonenumber_2);
        expect(requestApplicant.contactInformation[2].contactType).to.equal('EMAIL');
        expect(requestApplicant.contactInformation[2].value).to.equal(email_1);
        expect(requestApplicant.contactInformation[3].contactType).to.equal('EMAIL');
        expect(requestApplicant.contactInformation[3].value).to.equal(email_2);
      });
    });

    it('allows editing all fields on an existing contact person if errand was created in web UI', () => {
      const res = mockMexErrand_base;
      const contact = [
        {
          id: 667,
          version: 81,
          created: '2022-10-11T12:13:29.226233+02:00',
          updated: '2022-10-14T10:38:05.529007+02:00',
          extraParameters: {
            relation: '',
            extraInformation: 'Extra information',
          },
          personalNumber: Cypress.env('mockPersonNumber'),
          adAccount: 'kctest',
          type: 'PERSON',
          firstName: 'Kim',
          lastName: 'Testsson',
          personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
          roles: ['CONTACT_PERSON', 'SELLER'],
          addresses: [
            {
              street: 'Testvägen 4',
              postalCode: '123 34',
              city: 'SUNDSVALL',
              careOf: '',
            },
          ],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
        },
        {
          id: 2103,
          version: 1,
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          personalNumber: Cypress.env('mockPersonNumber'),
          adAccount: 'kctest',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ] as any;
      res.data.stakeholders = contact;
      cy.intercept('GET', '**/errand/errandNumber/*', res).as('getErrand');
      cy.intercept(
        'PATCH',
        `**/errands/${mockMexErrand_base.data.id}/stakeholders/${contact[0].id}`,
        mockMexErrand_base
      ).as('patchStakeholder');
      visit();

      cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]').should('exist');
      const renderedContact = cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact[0].firstName} ${contact[0].lastName}`);
      renderedContact.get('[data-cy="stakeholder-ssn"]').should('contain', `${contact[0].personalNumber}`);
      renderedContact
        .get('[data-cy="stakeholder-adress"]')
        .should(
          'contain',
          `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
        );
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact[0].firstName} ${contact[0].lastName}`);

      cy.get('button').contains('Redigera uppgifter').should('exist').click();

      cy.get('[data-cy="roll-select"]').should('have.value', 'SELLER');
      cy.get('[data-cy="contact-firstName"]').should('have.value', contact[0].firstName);
      cy.get('[data-cy="contact-lastName"]').should('have.value', contact[0].lastName);
      cy.get('[data-cy="contact-street"]').clear().type('Testgata');
      cy.get('[data-cy="contact-zip"]').clear().type('12345');
      cy.get('[data-cy="contact-city"]').clear().type('Teststaden');
      cy.get('[data-cy="contact-extrainfo"]').clear().type('Some information');

      cy.get('[data-cy="new-email-input"]').filter(':visible').type('test@example.com');
      cy.get('[data-cy="add-new-email-button"]').filter(':visible').click();
      cy.get('[data-cy="newPhoneNumber"]').clear().type('+46701740635');
      cy.get('[data-cy="newPhoneNumber-button"]').click();

      cy.get('button').contains('Ändra uppgifter').should('exist').click();
      cy.get('[data-cy="save-and-continue-button"]').should('exist').click();

      cy.wait('@patchStakeholder').should(({ request }) => {
        const requestStakeholder = request.body;
        expect(requestStakeholder.firstName).to.equal(contact[0].firstName);
        expect(requestStakeholder.lastName).to.equal(contact[0].lastName);
        expect(requestStakeholder.addresses[0].street).to.equal('Testgata');
        expect(requestStakeholder.addresses[0].postalCode).to.equal('12345');
        expect(requestStakeholder.addresses[0].city).to.equal('Teststaden');
        expect(requestStakeholder.contactInformation[0].contactType).to.equal('PHONE');
        expect(requestStakeholder.contactInformation[0].value).to.equal('+46701740635');
        expect(requestStakeholder.contactInformation[1].contactType).to.equal('EMAIL');
        expect(requestStakeholder.contactInformation[1].value).to.equal('test@example.com');
      });
    });

    it('makes readOnly firstName and lastName field when editing person stakeholders on errands not created in web UI', () => {
      const res = mockMexErrand_base;
      res.data.channel = Channels.ESERVICE;
      const contact = [
        {
          id: 667,
          version: 81,
          created: '2022-10-11T12:13:29.226233+02:00',
          updated: '2022-10-14T10:38:05.529007+02:00',
          extraParameters: {
            relation: 'Bror',
            extraInformation: 'Extra information',
          },
          type: 'PERSON',
          personalNumber: Cypress.env('mockPersonNumber'),
          adAccount: 'kctest',
          firstName: 'Kim',
          lastName: 'Testsson',
          personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
          roles: ['CONTACT_PERSON'],
          addresses: [
            {
              street: 'Testvägen 4',
              postalCode: '123 44',
              city: 'SUNDSVALL',
              careOf: '',
            },
          ],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
        },
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          adAccount: 'kctest',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ] as any;
      res.data.stakeholders = contact;
      cy.intercept('GET', '**/errand/errandNumber/*', res).as('getErrand');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base).as('patchErrand');
      visit();

      cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]').should('exist');
      const renderedContact = cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact[0].firstName} ${contact[0].lastName}`);
      renderedContact.get('[data-cy="stakeholder-ssn"]').should('contain', `${contact[0].personalNumber}`);
      renderedContact
        .get('[data-cy="stakeholder-adress"]')
        .should(
          'contain',
          `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
        );
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact[0].firstName} ${contact[0].lastName}`);

      cy.get('button').contains('Redigera uppgifter').should('exist').click();

      cy.get('[data-cy="contact-manual-toggle"]').should('not.exist');
      cy.get('[data-cy="contact-personalNumber"]').should('have.attr', 'readonly', 'readonly');
      cy.get('[data-cy="contact-firstName"]').should('be.enabled').and('have.value', contact[0].firstName);
      cy.get('[data-cy="contact-lastName"]').should('be.enabled').and('have.value', contact[0].lastName);
      cy.get('[data-cy="contact-street"]').should('be.enabled').and('have.value', contact[0].addresses[0].street);
      cy.get('[data-cy="contact-zip"]').should('be.enabled').and('have.value', contact[0].addresses[0].postalCode);
      cy.get('[data-cy="contact-city"]').should('be.enabled').and('have.value', contact[0].addresses[0].city);
      cy.get('[data-cy="contact-extrainfo"]')
        .should('be.enabled')
        .and('have.value', contact[0].extraParameters.extraInformation);
    });

    it('makes readOnly orgName field when editing organization stakeholders on errands not created in web UI', () => {
      const res = mockMexErrand_base;
      res.data.channel = Channels.ESERVICE;
      const contact = [
        {
          id: 667,
          version: 81,
          created: '2022-10-11T12:13:29.226233+02:00',
          updated: '2022-10-14T10:38:05.529007+02:00',
          extraParameters: {
            relation: 'Bror',
            extraInformation: 'Extra information',
          },
          type: 'ORGANIZATION',
          organizationName: 'Bolaget AB',
          organizationNumber: '112233-5555',
          firstName: '',
          lastName: '',
          personId: '',
          roles: ['CONTACT_PERSON'],
          addresses: [
            {
              addressCategory: 'POSTAL',
              street: 'Testvägen 454',
              postalCode: '123 34',
              city: 'SUNDSVALL',
              careOf: '',
            },
          ],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          personalNumber: '',
        },
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          adAccount: 'kctest',
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ];
      res.data.stakeholders = contact;
      cy.intercept('GET', '**/errand/errandNumber/*', res).as('getErrand');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base).as('patchErrand');
      visit();

      cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]').should('exist');
      const renderedContact = cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
      renderedContact.get('[data-cy="stakeholder-ssn"]').should('contain', contact[0].personalNumber);
      renderedContact
        .get('[data-cy="stakeholder-adress"]')
        .should(
          'contain',
          `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
        );
      renderedContact.get('[data-cy="stakeholder-name"]').should('contain', contact[0].organizationName);

      cy.get('button').contains('Redigera uppgifter').should('exist').click();

      cy.get('[data-cy="contact-manual-toggle"]').should('not.exist');
      cy.get('[data-cy="contact-organizationName"]').should('have.attr', 'readonly', 'readonly');
      cy.get('[data-cy="contact-firstName"]').should('not.exist');
      cy.get('[data-cy="contact-lastName"]').should('not.exist');
      cy.get('[data-cy="contact-street"]').should('be.enabled').and('have.value', contact[0].addresses[0].street);
      cy.get('[data-cy="contact-zip"]').should('be.enabled').and('have.value', contact[0].addresses[0].postalCode);
      cy.get('[data-cy="contact-city"]').should('be.enabled').and('have.value', contact[0].addresses[0].city);
      cy.get('[data-cy="contact-extrainfo"]')
        .should('be.enabled')
        .and('have.value', contact[0].extraParameters.extraInformation);
    });

    it('allows converting an existing stakeholder from contact person to owner', () => {
      const res = mockMexErrand_base;
      const contact = [
        {
          id: 667,
          version: 81,
          created: '2022-10-11T12:13:29.226233+02:00',
          updated: '2022-10-14T10:38:05.529007+02:00',
          extraParameters: {
            relation: '',
          },
          type: 'PERSON',
          firstName: 'Kim',
          lastName: 'Testarsson',
          personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
          roles: ['CONTACT_PERSON'],
          addresses: [
            {
              street: 'Testvägen 4',
              postalCode: '123 34',
              city: 'SUNDSVALL',
              careOf: '',
            },
          ],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          personalNumber: Cypress.env('mockPersonNumber'),
          adAccount: 'kctest',
        },
        {
          id: 2103,
          version: 1,
          personalNumber: Cypress.env('mockPersonNumber'),
          adAccount: 'kctest',
          created: '2024-05-21T11:04:18.753613+02:00',
          updated: '2024-05-21T11:04:18.753618+02:00',
          type: 'PERSON',
          firstName: 'My',
          lastName: 'Testsson',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          address: {
            streetAddress: '',
          },
          contactInformation: [],
          extraParameters: {},
        },
      ] as any;
      res.data.stakeholders = contact;
      cy.intercept('GET', '**/errand/errandNumber/*', res).as('getErrand');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}`, mockMexErrand_base).as('patchErrand');
      cy.intercept('PATCH', `**/errands/${mockMexErrand_base.data.id}/stakeholders/${contact[0].id}`, {}).as(
        'patchStakeholder'
      );
      visit();

      cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]').should('exist');
      const renderedContact = cy.get('[data-cy="registered-contacts"] [data-cy="rendered-CONTACT_PERSON"]');
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact[0].firstName} ${contact[0].lastName}`);
      renderedContact.get('[data-cy="stakeholder-ssn"]').should('contain', `${contact[0].personalNumber}`);
      renderedContact
        .get('[data-cy="stakeholder-adress"]')
        .should(
          'contain',
          `${contact[0].addresses[0].street} ${contact[0].addresses[0].postalCode} ${contact[0].addresses[0].city}`
        );
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact[0].firstName} ${contact[0].lastName}`);

      cy.get('button').contains('Gör till ärendeägare').should('exist').click();
      cy.get('button').contains('Ja').should('exist').click();
      cy.get('[data-cy="save-and-continue-button"]').should('exist').click();

      cy.wait('@patchStakeholder').should(({ request }) => {
        expect(request.body.roles[0]).to.equal('APPLICANT');
      });
    });
  });
});
