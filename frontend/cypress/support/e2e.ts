import '@cypress/code-coverage/support'
import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';

addMatchImageSnapshotCommand({
  failureThreshold: 0.3,
  failureThresholdType: 'percent',
  allowSizeMismatch: true,
  capture: 'viewport',
  comparisonMethod: 'ssim',
});

// Cypress.Commands.overwrite('screenshot', (originalFn, subject, ...args) => {
//   cy.document().its('fonts.status').should('equal', 'loaded');
//   originalFn(subject, ...args);
// });

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Checks if element is within the viewport. Useful for scrollIntoView testing.
       */
      waitForFonts(): Chainable<Element>;
    }
  }
}


Cypress.Commands.add('waitForFonts', () => {
  cy.document().its('fonts.status').should('equal', 'loaded');
});
