import { onlyOn } from '@cypress/skip-test';
import { mockMessageRenderRequest, mockMessages } from '../fixtures/mockMessages';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockPermits } from '../fixtures/mockPermits';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAsset } from '../fixtures/mockAsset';
import { mockConversations, mockConversationMessages } from '../fixtures/mockConversations';
import { mockRelations } from '../fixtures/mockRelations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Message tab', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept(
        'GET',
        '**/contract/2024-01026',
        mockMexErrand_base.data.extraParameters.find((param) => param.key === 'contractId')?.values[0]
      ).as('getContract');
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/assets?**', mockAsset);
      cy.intercept('POST', '**/errands/*/facilities', mockMexErrand_base);
      cy.intercept('GET', '**/metadata/jsonschemas/FTErrandAssets/latest', mockJsonSchema).as('getJsonSchema');
    });

    const goToMessageTab = () => {
      cy.visit('/arende/2281/PRH-2022-000019');
      cy.wait('@getErrandById');
      cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
      cy.get('button').contains('Meddelanden').should('exist').click();
    };

    it('views messages in inbox', () => {
      cy.intercept('PUT', `**/messages/*/viewed/*`, mockMessages);

      goToMessageTab();
      if (
        cy
          .get('[data-cy="message-container"] .sk-avatar')
          .should(
            'have.length',
            mockMessages.data.length + mockConversationMessages.data.length * mockConversations.data.data.length
          )
      ) {
        // cy.get('[data-cy="expand-message-button"]').each((button) => {
        //   cy.wrap(button).should('exist').click();
        // });
        mockMessages.data.forEach((message) => {
          if (message.messageType === 'EMAIL' && message.emailHeaders[0].header === 'MESSAGE_ID') {
            const node = cy.get(`[data-cy="node-${message.emailHeaders[0].values}"]`);
            node.should('exist').click();
            node.find('[data-cy="sender"]').should('exist');
            cy.get(`[data-cy="expand-message-button-${message.emailHeaders[0].values}"]`).should('exist').click();

            if (message.direction === 'INBOUND') {
              cy.get('[data-cy="respond-button"]').should('exist');
            }

            if (message.attachments?.length) {
              message.attachments.map((attachment, index) => {
                cy.get(`[data-cy="message-attachment-${index}"]`).should('exist').contains(attachment.name);
              });
            }

            cy.get('[data-cy="message-subject"]').should('exist').contains(message.subject);
            cy.get('[data-cy="message-body"]').should('exist').contains(message.message);

            cy.get('[data-cy="close-message-wrapper"]')
              .should('exist')
              .first()
              .within(() => {
                cy.get('[data-cy="close-message-wrapper-icon"]').should('exist').click({ force: true });
              });
          }
        });
      }
    });

    it('sends sms with template', () => {
      cy.intercept('POST', '**/render', mockMessageRenderRequest);
      cy.intercept('POST', '**/sms', mockMessages).as('sendSms');

      goToMessageTab();
      cy.get('[data-cy="sidebar-new-message-button"]').should('exist').first().click();

      cy.get('[data-cy="radio-button-group"]')
        .should('exist')
        .each(() => {
          cy.get('[data-cy="useSms-radiobutton-true"]').should('exist').check({ force: true });
        });

      cy.get('[data-cy="send-message-button"]').should('be.disabled');

      cy.get('[data-cy="messageTemplate"]').should('exist').eq(1).select(1);
      cy.get('[data-cy="decision-richtext-wrapper"]').should('exist');

      cy.get('[data-cy="newPhoneNumber"]').should('exist').eq(1).clear().type('1234abc890');
      cy.get('[data-cy="messagePhone-error"]').should('exist').contains('Ej giltigt telefonnummer');

      cy.get('[data-cy="newPhoneNumber"]').should('exist').eq(1).clear().type('+46701740635');
      cy.get('[data-cy="messagePhone-error"]').should('not.exist');

      cy.get('[data-cy="newPhoneNumber-button"]').should('be.enabled').eq(1).click({ force: true });
      cy.get('[data-cy="send-message-button"]').should('be.enabled').eq(1).click({ force: true });

      cy.wait('@sendSms').should(({ request }) => {
        expect(request.body.phonenumber).to.equal('+46701740635');
      });
    });

    it('sends email with an existing attachment from errand and a new attachment', () => {
      cy.intercept('POST', '**/render', mockMessageRenderRequest);
      cy.intercept('POST', '**/email', mockMessages).as('sendEmail');
      cy.intercept('POST', '**/attachments', mockAttachments).as('postAttachments');

      goToMessageTab();
      cy.get('[data-cy="new-message-button"]').should('exist').click();
      // FIXME Need to use first since two message composer components are rendered,
      // on for the sidebar and one for the message tab. Not good.
      cy.get('[data-cy="useEmail-radiobutton-true"]').first().click();
      cy.get('[data-cy="send-message-button"]').should('be.disabled');

      cy.get('.ql-editor').should('exist');
      cy.get('[data-cy="decision-richtext-wrapper"]').should('not.be.disabled').first().type('Mock message');

      const ownerEmail = mockMexErrand_base.data.stakeholders
        .find((stakeholder) => stakeholder.roles.includes('APPLICANT'))
        ?.contactInformation?.find((c) => c.contactType === 'EMAIL')?.value;

      cy.get('[data-cy="existing-email-addresses"]')
        .should('exist')
        .first()
        .select(ownerEmail + ' (Ärendeägare)');
      cy.get('[data-cy="new-email-input"]').should('exist').clear().type('test.com');
      cy.get('[data-cy="add-new-email-button"]').should('be.disabled');
      cy.get('[data-cy="new-email-input"]').should('exist').clear().type('test@example.com');
      cy.get('[data-cy="add-new-email-button"]').should('be.enabled').click({ force: true });

      // Add existing attachment
      cy.get('[data-cy="select-errand-attachment"]').should('exist').first().select(1);
      cy.get('[data-cy="add-attachment-button-email"]').should('exist').click({ force: true });
      cy.get('[data-cy="browse-button"]').should('exist').click({ force: true });

      // Try to add empty attachment
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/empty-attachment.txt', { force: true });
      cy.get('[id="newAttachments-error"]')
        .should('exist')
        .contains('Bilagan du försöker lägga till är tom. Försök igen.');

      // Add new attachment
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/attachment.txt', { force: true });
      cy.get('[data-cy="attachment-wrapper"] .sk-icon').should('exist');

      cy.get('[data-cy="send-message-button"]').first().should('be.enabled').click({ force: true });

      cy.wait('@sendEmail').should(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
    });

    // FIXME Is it possible to send a message to OpenE in MEX?
    // it.only('sends message to openE', () => {
    //   cy.intercept('POST', '**/render', mockMessageRenderRequest);
    //   cy.intercept('POST', '**/email', mockMessages).as('sendEmail');
    //   cy.intercept('POST', '**/webmessage', mockMessages).as('sendWebmessage');

    //   goToMessageTab();
    //   cy.get('[data-cy="new-message-button"]').should('exist').click();
    //   cy.get('[data-cy="send-message-button"]').should('be.disabled');

    //   cy.get('.ql-editor').should('exist');
    //   cy.get('[data-cy="decision-richtext-wrapper"]').should('not.be.disabled').first().type('Mock message');

    //   cy.get('[data-cy="radio-button-group"]')
    //     .should('exist')
    //     .each(() => {
    //       cy.get('[data-cy="useEmail-radiobutton-true"]').should('not.be.checked');
    //       cy.get('[data-cy="useWebMessage-radiobutton-true"]').should('be.checked');
    //     });

    //   cy.get('[data-cy="messageEmail-input"]').should('not.exist');
    //   cy.get('[data-cy="messageEmail-error"]').should('not.exist');

    //   cy.get('[data-cy="send-message-button"]').should('be.enabled').click({ force: true });
    //   cy.get('button').should('exist').contains('Ja').click();

    //   cy.wait('@sendWebmessage').should(({ request, response }) => {
    //     expect(request.body).to.contain('webmessage');
    //     expect(response?.statusCode).to.equal(200);
    //   });
    // });

    it('answers inbound email message by email', () => {
      cy.intercept('PUT', `**/messages/*/viewed/*`, mockMessages);
      cy.intercept('POST', '**/render', mockMessageRenderRequest);
      cy.intercept('POST', '**/email', mockMessages).as('sendEmail');
      cy.intercept('POST', '**/webmessage', mockMessages).as('sendWebmessage');

      goToMessageTab();

      mockMessages.data.forEach((message) => {
        if (message.direction === 'INBOUND' && message.messageType === 'EMAIL') {
          const messageNode = cy.get(`[data-cy="node-${message.emailHeaders[0].values}"]`);
          messageNode.should('exist').click();
          cy.get(`[data-cy="expand-message-button-${message.emailHeaders[0].values}"]`).should('exist').click();
          messageNode.find(`[data-cy="respond-button"]`).should('exist').click({ force: true });

          cy.get('[data-cy="messageTemplate"]').should('exist').first().select(1);
          cy.get('[data-cy="email-tag-0"]').should('exist').contains(message.email);
          cy.get('[data-cy="send-message-button"]').should('exist').first().click({ force: true });

          cy.wait('@sendEmail').should(({ request }) => {
            expect(request.body).to.include(`Content-Disposition: form-data; name="contactMeans"`);
            expect(request.body).to.include(`email`);
            expect(request.body).to.include(Cypress.env('mockEmail'));
            expect(request.body.replaceAll(/[\n\r\s]/g, '')).to.contain(`name="contactMeans"email`);
          });
        }
      });
    });

    // FIXME Is it possible to reply to a webmessage by webmessage in MEX?
    // it.only('answers inbound webmessage message by webmessage', () => {
    //   cy.intercept('PUT', `**/messages/*/viewed/*`, mockMessages);
    //   cy.intercept('POST', '**/render', mockMessageRenderRequest);
    //   cy.intercept('POST', '**/email', mockMessages).as('sendEmail');
    //   cy.intercept('POST', '**/webmessage', mockMessages).as('sendWebmessage');

    //   goToMessageTab();

    //   mockMessages.data.forEach((message) => {
    //     if (message.direction === 'INBOUND' && message.messageType === 'WEBMESSAGE') {
    //       const messageNode = cy.get(`[data-cy="node-${message.messageId}"]`);
    //       messageNode.should('exist').click();
    //       messageNode.find('[data-cy="respond-button"]').should('exist').click({ force: true });

    //       cy.get('[data-cy="messageTemplate"]').should('exist').first().select(1);
    //       cy.get('[data-cy="messageEmail-input"]').should('not.exist');
    //       cy.get('[data-cy="send-message-button"]').should('exist').click({ force: true });
    //       cy.get('button').should('exist').contains('Ja').click();

    //       cy.wait('@sendWebmessage').should(({ request }) => {
    //         expect(request.body.replaceAll(/[\n\r\s]/g, '')).to.contain(`name="contactMeans"webmessage`);
    //       });
    //     }
    //   });
    // });
  });
});
