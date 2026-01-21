/// <reference types="cypress" />

import { CaseLabels } from '@casedata/interfaces/case-label';
import { Channels } from '@casedata/interfaces/channels';
import { Role } from '@casedata/interfaces/role';
import { StakeholderType } from '@casedata/interfaces/stakeholder';
import { latestBy } from '@common/services/helper-service';
import { onlyOn } from '@cypress/skip-test';
import { mockAddress } from 'cypress/e2e/case-data/fixtures/mockAddress';
import { mockAttachmentsPT } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockPTErrand_base } from 'cypress/e2e/case-data/fixtures/mockPtErrand';
import dayjs from 'dayjs';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { MOCK_PERSON_NUMBER } from '../fixtures/mockMexErrand';
import { mockPermits } from '../fixtures/mockPermits';
import { mockRelations } from '../fixtures/mockRelations';

onlyOn(Cypress.env('application_name') === 'PT', () => {
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
      cy.intercept('GET', /\/errand\/\d*/, mockPTErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachmentsPT).as('getErrandAttachments');
      cy.intercept('POST', '**/stakeholders/personNumber', mockPTErrand_base.data.stakeholders);
      cy.intercept('GET', '**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset).as(
        'getAssets'
      );
      cy.intercept('GET', '**/assets?**', {});
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');

      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('GET', '**/contracts/2024-01026', mockPTErrand_base).as('getContract');

      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('PATCH', '**/errands/**/extraparameters', {});
    });

    it('shows the correct base errand information', () => {
      const caseLabel = CaseLabels.ALL[mockPTErrand_base.data.caseType as keyof typeof CaseLabels.ALL];
      const priority: string = mockPTErrand_base.data.priority;
      const channel = Channels[mockPTErrand_base.data.channel as keyof typeof Channels];
      const applicant = mockPTErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.APPLICANT));
      const contact = mockPTErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.CONTACT_PERSON));
      visit();

      // Errand info fields in page header
      cy.get('[data-cy="errandStatusLabel"]').contains('Ärendestatus').should('exist');
      const latestStatus = latestBy(mockPTErrand_base.data.statuses, 'dateTime').statusType;
      cy.get('[data-cy="errandStatus"]').contains(latestStatus).should('exist');
      cy.get('[data-cy="errandRegisteredLabel"]').contains('Registrerat').should('exist');
      cy.get('[data-cy="errandRegistered"]')
        .contains(dayjs(mockPTErrand_base.data.created).format('YYYY-MM-DD HH:mm'))
        .should('exist');
      cy.get('[data-cy="errandStakeholderLabel"]').contains('Ärendeägare').should('exist');
      cy.get('[data-cy="errandStakeholder"]')
        .contains(`${applicant?.firstName} ${applicant?.lastName}`)
        .should('exist');
      cy.get('[data-cy="errandPersonalNumberLabel"]').contains('Personnummer').should('exist');

      cy.get('[data-cy="errandPersonalNumber"]').contains(applicant?.personalNumber!).should('exist');

      // Fields in errand form
      cy.get('[data-cy="channel-input"]').should('exist');
      cy.get('[data-cy="channel-input"]').should('have.value', channel);
      cy.get('[data-cy="municipality-input"]').should('exist');
      cy.get('[data-cy="municipality-input"]').children().contains('Sundsvall').should('exist');
      cy.get('[data-cy="casetype-input"]').should('exist');
      cy.get('[data-cy="casetype-input"]').children().contains(caseLabel).should('exist');
      cy.get('[data-cy="priority-input"]').should('exist');
      cy.get('[data-cy="priority-input"]')
        .children()
        .contains(priority as string)
        .should('exist');

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
          `${applicant?.addresses?.[0].street} ${applicant?.addresses?.[0].postalCode} ${applicant?.addresses?.[0].city}`
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
          `${contact?.addresses?.[0].street} ${contact?.addresses?.[0].postalCode} ${contact?.addresses?.[0].city}`
        );
      renderedContact
        .get('[data-cy="stakeholder-name"]')
        .should('contain', `${contact?.firstName} ${contact?.lastName}`);
    });

    it('search organization as stakeholder should not be showing', () => {
      cy.intercept('GET', '**/errand/errandNumber/*', mockPTErrand_base).as('getErrand');
      visit();
      cy.get('[data-cy="search-enterprise-owner-form"]').should('not.exist');
    });

    it('allows editing all fields on an existing contact person if errand was created in web UI', () => {
      const res = mockPTErrand_base;
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
      cy.intercept('GET', '**/errand/errandNumber/*', res).as('getErrand');
      cy.intercept(
        'PATCH',
        `**/errands/${mockPTErrand_base.data.id}/stakeholders/${contact[0].id}`,
        mockPTErrand_base
      ).as('patchErrand');
      cy.visit('/arende/2281/PRH-2022-000019');
      cy.wait('@getErrand');

      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(0).should('have.text', `Grunduppgifter`).click({ force: true });
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

      cy.get('[data-cy="roll-select"]').should('have.value', 'DRIVER');
      cy.get('[data-cy="contact-firstName"]').should('have.value', contact[0].firstName);
      cy.get('[data-cy="contact-lastName"]').should('have.value', contact[0].lastName);
      cy.get('[data-cy="contact-street"]').clear().type('Testgata');
      cy.get('[data-cy="contact-zip"]').clear().type('12345');
      cy.get('[data-cy="contact-city"]').clear().type('Teststaden');

      cy.get('[data-cy="new-email-input"]').filter(':visible').type('test@example.com');
      cy.get('[data-cy="add-new-email-button"]').filter(':visible').click();
      cy.get('[data-cy="newPhoneNumber"]').clear().type('+46701740635');
      cy.get('[data-cy="newPhoneNumber-button"]').click();

      cy.get('button').contains('Ändra uppgifter').should('exist').click();
      cy.get('[data-cy="save-and-continue-button"]').should('exist').click();
      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.firstName).to.equal(contact[0].firstName);
        expect(request.body.lastName).to.equal(contact[0].lastName);
        expect(request.body.addresses[0].street).to.equal('Testgata');
        expect(request.body.addresses[0].postalCode).to.equal('12345');
        expect(request.body.addresses[0].city).to.equal('Teststaden');
        expect(request.body.contactInformation[0].contactType).to.equal('PHONE');
        expect(request.body.contactInformation[0].value).to.equal('+46701740635');
        expect(request.body.contactInformation[1].contactType).to.equal('EMAIL');
        expect(request.body.contactInformation[1].value).to.equal('test@example.com');
      });
    });
  });
});
