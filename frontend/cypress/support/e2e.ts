import '@cypress/code-coverage/support'

beforeEach(() => {
  cy.intercept('GET', '**/supporterrands*', {}).as('getSupportErrands');
});