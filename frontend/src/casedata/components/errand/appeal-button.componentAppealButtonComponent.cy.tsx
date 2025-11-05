import React from 'react';
import { AppealButtonComponent } from './appeal-button.component';

describe('<AppealButtonComponent />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<AppealButtonComponent disabled={false} />);
  });
});
