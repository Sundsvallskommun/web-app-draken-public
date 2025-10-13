// 'use client';

import React from 'react';
import { CaseStatusLabelComponent } from './case-status-label.component';
import { mockErrand_base } from '@cypress/e2e/case-data/fixtures/mockErrand';

describe('<CaseStatusLabelComponent />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<CaseStatusLabelComponent externalStatus={mockErrand_base.data.status.statusType} />);
    cy.get(`[data-cy-root]`).should('exist').should('contain', mockErrand_base.data.status.statusType);
  });
});
