import { interceptFormData } from 'cypress-intercept-formdata';

export const goToMessageTab = (errandNumber = 'KC-00000001') => {
  cy.visit(`arende/${errandNumber}`);
  cy.wait('@getSupportErrand');
  cy.get('.sk-cookie-consent-btn-wrapper').should('exist').contains('Godkänn alla').click();
  cy.get('button').contains('Meddelanden').should('exist').click();
};

export const sendSmsMessage = () => {
  cy.get('[data-cy="new-message-button"]').should('exist').click();

  cy.get('[data-cy="message-channel-radio-button-group"]').should('exist');
  cy.get('[data-cy="useEmail-radiobutton-true"]').should('exist');
  cy.get('[data-cy="useSms-radiobutton-true"]').should('exist').check({ force: true });

  cy.get('[data-cy="decision-richtext-wrapper"]').first().should('exist').clear().type('Mock message', { delay: 100 });

  cy.get('[data-cy="newPhoneNumber"]').first().should('exist').clear().type('+46701740635', { delay: 100 });
  cy.get('[data-cy="newPhoneNumber-button"]').first().should('exist').click({ force: true });

  cy.get('[data-cy="send-message-button"]').first().should('exist').click();
  cy.wait('@sendMessage').should(({ request }) => {
    const data = interceptFormData(request as any);
    expect(data['contactMeans']).to.equal('sms');
    expect(data['plaintextMessage']).to.equal('Mock message');
    expect(data['recipientPhone']).to.equal('+46701740635');
  });
};

export const sendEmailWithAttachment = () => {
  cy.get('[data-cy="new-message-button"]').should('exist').click();

  cy.get('[data-cy="decision-richtext-wrapper"]').first().should('exist').clear().type('Mock message', { delay: 100 });

  cy.get('[data-cy="message-channel-radio-button-group"]').should('exist');
  cy.get('[data-cy="useEmail-radiobutton-true"]').should('exist').check({ force: true });
  cy.get('[data-cy="useSms-radiobutton-true"]').should('exist');
  cy.get('[data-cy="new-email-input"]').first().should('exist').clear().type('test@example.com', { delay: 100 });
  cy.get('[data-cy="add-new-email-button"]').first().should('exist').click({ force: true });

  cy.get('[data-cy="add-attachment-button"]').contains('Bifoga fil').should('exist').click();
  cy.get('button').contains('Bläddra').should('exist').click();
  cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/empty-attachment.txt', { force: true });
  cy.get('.sk-form-error-message').should('contain.text', 'Bilagan du försöker lägga till är tom. Försök igen.');
  cy.get('button').contains('Bläddra').should('exist').click();
  cy.get('input[type=file]').selectFile('cypress/e2e/kontaktcenter/files/attachment.txt', { force: true });
  cy.get('[data-cy="upload-button"]').contains('Ladda upp').should('exist').click();

  cy.get('[data-cy="send-message-button"]').first().should('exist').click();
  cy.wait('@sendMessage').should(({ request }) => {
    const data = interceptFormData(request as any);
    expect(data['contactMeans']).to.equal('email');
    expect(data['plaintextMessage']).to.equal('Mock message');
    expect(data['files']).to.equal('attachment.txt');
  });
};
