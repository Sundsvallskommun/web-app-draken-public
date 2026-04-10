import React, { useState } from 'react';
import { MainErrandsSidebar } from './main-errands-sidebar.component';
import { mockMe } from '@cypress/e2e/case-data/fixtures/mockMe';
import { User } from '@common/interfaces/user';
import { mockNotifications } from '@cypress/e2e/kontaktcenter/fixtures/mockSupportNotifications';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';

describe('<MainErrandsSidebar />', () => {
  it('renders', () => {
    const SidebarTestWrapper = () => {
      const [open, setOpen] = useState(false);

      useUserStore.getState().setUser(mockMe.data as User);
      useSupportStore.getState().setNotifications(mockNotifications);
      useConfigStore.getState().setMunicipalityId('2281');

      return (
        <MainErrandsSidebar
          showAttestationTable={undefined}
          setShowAttestationTable={undefined}
          open={open}
          setOpen={setOpen}
        />
      );
    };

    cy.intercept('GET', '**/supportnotifications/2281', mockNotifications).as('getSupportNotifications');

    cy.mount(<SidebarTestWrapper />);
    //Minimized sidebar
    cy.get(`[aria-label="status-button-NEW"]`).should('exist');
    cy.get(`[aria-label="status-button-ONGOING"]`).should('exist');
    cy.get(`[aria-label="status-button-SUSPENDED"]`).should('exist');
    cy.get(`[aria-label="status-button-ASSIGNED"]`).should('exist');
    cy.get(`[aria-label="status-button-NEW"]`).should('exist');
    cy.get(`[aria-label="status-button-SOLVED"]`).should('exist');

    //Notifications
    cy.get(`[aria-label="Notifieringar"]`).should('exist').click();
    cy.wait('@getSupportNotifications');
    cy.get(`[aria-label="Stäng notiser"]`).should('exist').click();
    cy.get(`[class="sk-badge-content"]`).should('exist').should('contain', 2);

    //Open sidebar
    cy.get(`[aria-label="Öppna sidomeny"]`).should('exist').click();
    cy.get(`[aria-label="status-button-NEW"]`).should('exist');
    cy.get(`[aria-label="status-button-ONGOING"]`).should('exist');
    cy.get(`[aria-label="status-button-SUSPENDED"]`).should('exist');
    cy.get(`[aria-label="status-button-ASSIGNED"]`).should('exist');
    cy.get(`[aria-label="status-button-NEW"]`).should('exist');
    cy.get(`[aria-label="status-button-SOLVED"]`).should('exist');
    cy.get(`[aria-label="Stäng sidomeny"]`).should('exist').click();
  });
});
