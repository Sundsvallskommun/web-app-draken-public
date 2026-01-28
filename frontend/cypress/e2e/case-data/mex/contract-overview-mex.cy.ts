/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockNotifications } from '../../../../cypress/e2e/kontaktcenter/fixtures/mockSupportNotifications';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContractAttachment } from '../fixtures/mockContract';
import {
  mockContractsList,
  mockContractsListEmpty,
  mockContractsListFiltered,
  mockContractDetailLeaseAgreement,
  mockContractDetailPurchaseAgreement,
} from '../fixtures/mockContractsList';
import { mockErrands_base } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Contract Overview page', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('GET', '**/featureflags', []);
      cy.intercept('GET', '**/errands*', mockErrands_base).as('getErrands');
      cy.intercept('GET', '**/casedatanotifications/2281', mockNotifications).as('getNotifications');
      cy.intercept('GET', '**/contracts?*', mockContractsList).as('getContracts');
      cy.visit('/oversikt');
      cy.wait('@getErrands');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
    });

    const navigateToContractOverview = () => {
      cy.get('button').contains('Avtalsöversikt').should('exist').click();
      cy.wait('@getContracts');
    };

    it('can navigate to contract overview by clicking Avtalsöversikt button', () => {
      cy.get('button').contains('Avtalsöversikt').should('exist').click();
      cy.wait('@getContracts');
      cy.get('h1').contains('Alla avtal').should('exist');
    });

    it('displays the contracts table with correct headers', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contracts-table"]').should('exist');

      const expectedHeaders = [
        'Status',
        'Fastighetsbeteckning',
        'Distrikt',
        'Avtalstyp',
        'Avtalssubtyp',
        'Parter',
        'Avtalsperiod',
        'Uppsägningsdatum',
      ];

      expectedHeaders.forEach((header) => {
        cy.get('[data-cy="contracts-table"] th').contains(header).should('exist');
      });
    });

    it('displays contract data in the table', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contracts-table"] tbody tr').should('have.length', mockContractsList.contracts?.length);

      // Check first row data
      cy.get('[data-cy="contracts-table"] tbody tr')
        .first()
        .within(() => {
          cy.contains('TESTKOMMUN TESTFASTIGHET 1:1').should('exist');
          cy.contains('Testdistrikt Norra').should('exist');
          cy.contains('2049-00001').should('exist');
          cy.contains('Arrende').should('exist');
          cy.contains('Tomträtt').should('exist');
          cy.contains('Test Kommun AB').should('exist');
          cy.contains('Testföretag AB').should('exist');
          cy.contains('2024-01-01').should('exist');
          cy.contains('2025-12-31').should('exist');
        });
    });

    it('displays the filter bar', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-query-filter"]').should('exist');
      // cy.get('[data-cy="show-filters-button"]').should('exist');
      cy.get('[data-cy="contract-type-filter"]').should('exist');
      cy.get('[data-cy="contract-lease-type-filter"]').should('exist');
      cy.get('[data-cy="contract-dates-filter"]').should('exist');
      cy.get('[data-cy="contract-status-filter"]').should('exist');
    });

    it('can use the search field', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-query-filter"]').should('exist').type('BALDER');
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-query-filter"]').parent().find('button').contains('Sök').click();
      cy.wait('@getFilteredContracts');
      cy.get('[data-cy="contracts-table"] tbody tr').should('have.length', mockContractsListFiltered.contracts?.length);
    });

    it('can filter by contract type', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-type-filter"]').click();
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-type-filter-LEASE_AGREEMENT"]').click({ force: true });
      cy.wait('@getFilteredContracts');
    });

    it('can filter by lease type (subtype)', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-lease-type-filter"]').click();
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-lease-type-filter-LEASEHOLD"]').click({ force: true });
      cy.wait('@getFilteredContracts');
    });

    it('can filter by status', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-status-filter"]').click();
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-status-filter-ACTIVE"]').click({ force: true });
      cy.wait('@getFilteredContracts');
    });

    it('can filter by date period', () => {
      navigateToContractOverview();
      cy.get('[data-cy="contract-dates-filter"]').click();
      cy.get('[data-cy="contract-filter-startdate"]').should('exist').type('2024-01-01');
      cy.get('[data-cy="contract-filter-enddate"]').should('exist').type('2024-12-31');
      cy.intercept('GET', '**/contracts?*', mockContractsListFiltered).as('getFilteredContracts');
      cy.get('[data-cy="contract-dates-apply"]').click();
      cy.wait('@getFilteredContracts');
    });

    it('displays empty state when no contracts found', () => {
      // Override the default intercept before navigating
      cy.intercept('GET', '**/contracts?*', mockContractsListEmpty).as('getContracts');
      cy.get('button').contains('Avtalsöversikt').should('exist').click();
      cy.wait('@getContracts');
      cy.contains('Inga avtal hittades').should('exist');
    });

    it('displays pagination controls', () => {
      navigateToContractOverview();
      // Pagination controls are in the table footer area
      cy.contains('Sida:').should('exist');
      cy.contains('Rader per sida:').should('exist');
      cy.contains('Radhöjd:').should('exist');
      cy.get('input#pageSize').should('exist');
      cy.get('select#rowHeight').should('exist');
    });

    it('can change rows per page', () => {
      navigateToContractOverview();
      cy.get('input#pageSize').should('exist').clear().type('24');
      cy.intercept('GET', '**/contracts?*limit=24*', mockContractsList).as('getContractsNewLimit');
      cy.wait('@getContractsNewLimit');
    });

    it('can change row height', () => {
      navigateToContractOverview();
      cy.get('select#rowHeight').should('exist').select('Tät');
      // The dense prop adds a data-dense attribute
      cy.get('[data-cy="contracts-table"]').should('have.attr', 'data-dense', 'dense');
    });

    it('displays parties on separate lines', () => {
      navigateToContractOverview();
      // Check that parties are displayed on separate lines (in separate divs)
      // Parties column is index 5 (0: propertyNames, 1: districts, 2: contractId, 3: type, 4: leaseType, 5: parties)
      cy.get('[data-cy="contracts-table"] tbody tr')
        .first()
        .within(() => {
          cy.get('td').eq(5).find('div > div').should('have.length', 2);
          cy.get('td').eq(5).find('div > div').first().should('contain.text', 'Test Kommun AB');
          cy.get('td').eq(5).find('div > div').last().should('contain.text', 'Testföretag AB');
        });
    });

    it('displays contract period dates on separate lines', () => {
      navigateToContractOverview();
      // Check that dates are displayed on separate lines (in separate divs)
      // Avtalsperiod column is index 6
      cy.get('[data-cy="contracts-table"] tbody tr')
        .first()
        .within(() => {
          cy.get('td').eq(6).find('div > div').should('have.length', 2);
          cy.get('td').eq(6).find('div > div').first().should('contain.text', '2024-01-01');
          cy.get('td').eq(6).find('div > div').last().should('contain.text', '2025-12-31');
        });
    });

    it('can sort by clicking sortable column headers', () => {
      navigateToContractOverview();
      // Click on Avtalstyp header to sort
      cy.intercept('GET', '**/contracts?*', mockContractsList).as('getSortedContracts');
      cy.get('[data-cy="contracts-table"] th').contains('Avtalstyp').click();
      cy.wait('@getSortedContracts');
    });

    describe('Contract detail panel', () => {
      beforeEach(() => {
        // Intercept attachment requests to prevent 401 errors
        cy.intercept('GET', '**/contracts/**/attachments/**', mockContractAttachment).as('getContractAttachment');
      });

      it('opens contract detail panel when clicking a row', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        // Click on the first contract row
        cy.get('[data-cy="contract-row-0"]').click();

        // The detail panel should appear
        cy.get('[data-cy="close-contract-detail-wrapper"]').should('be.visible');
      });

      it('displays correct contract type in panel header for lease agreement', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Header should show "Arrende" for lease agreement
        cy.get('[data-cy="contract-detail-panel"]').contains('Arrende').should('be.visible');
      });

      it('displays correct contract type in panel header for purchase agreement', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailPurchaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Header should show "Köpeavtal" for purchase agreement
        cy.get('[data-cy="contract-detail-panel"]').contains('Köpeavtal').should('be.visible');
      });

      it('displays parties disclosure with party tables for lease agreement', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Parties disclosure should be visible and initially open
        cy.get('[data-cy="parties-disclosure"]').should('be.visible');

        // Upplåtare table should show lessor
        cy.get('[data-cy="Upplåtare-table"]').should('exist');
        cy.get('[data-cy="Upplåtare-table"]').contains('Sundsvalls Kommun').should('exist');

        // Arrendatorer table should show lessees
        cy.get('[data-cy="Arrendatorer-table"]').should('exist');
        cy.get('[data-cy="Arrendatorer-table"]').contains('Anna Arrendator').should('exist');
        cy.get('[data-cy="Arrendatorer-table"]').contains('Bengt Arrendator').should('exist');
      });

      it('displays parties disclosure with party tables for purchase agreement', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailPurchaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Parties disclosure should be visible
        cy.get('[data-cy="parties-disclosure"]').should('exist');

        // Säljare table should show seller
        cy.get('[data-cy="Säljare-table"]').should('exist');
        cy.get('[data-cy="Säljare-table"]').contains('Sundsvalls Kommun').should('exist');

        // Köpare table should show buyer
        cy.get('[data-cy="Köpare-table"]').should('exist');
        cy.get('[data-cy="Köpare-table"]').contains('Kalle Köpare').should('exist');
      });

      it('displays area disclosure with property designations', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Area disclosure should be visible
        cy.get('[data-cy="area-disclosure"]').should('exist');
        cy.get('[data-cy="area-disclosure"]').click();

        // Property designations should be displayed
        cy.get('[data-cy="property-designation-checkboxgroup"]').should('exist');
      });

      it('displays avtalstid disclosure for lease agreement', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Avtalstid disclosure should be visible for lease agreements
        cy.get('[data-cy="avtalstid-disclosure"]').should('exist');
        cy.get('[data-cy="avtalstid-disclosure"]').click();

        // Start and end date fields should exist
        cy.get('[data-cy="avtalstid-start"]').should('exist');
        cy.get('[data-cy="avtalstid-end"]').should('exist');
      });

      it('displays lopande avgift disclosure', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Löpande avgift disclosure should be visible
        cy.get('[data-cy="lopande-disclosure"]').should('exist');
      });

      it('displays bilagor disclosure', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Bilagor disclosure should be visible
        cy.get('[data-cy="bilagor-disclosure"]').should('exist');
      });

      it('form fields are read-only in contract detail panel', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Old contract ID input should be read-only
        cy.get('[data-cy="old-contract-id-input"]').should('have.attr', 'readonly');

        // Open avtalstid disclosure and check date fields
        cy.get('[data-cy="avtalstid-disclosure"]').click();
        cy.get('[data-cy="avtalstid-start"]').should('have.attr', 'readonly');
        cy.get('[data-cy="avtalstid-end"]').should('have.attr', 'readonly');
      });

      it('does not display save button in read-only mode', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Save button should not exist
        cy.get('[data-cy="save-contract-button"]').should('not.exist');
      });

      it('does not display update parties button in read-only mode', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Update parties button should not exist
        cy.get('[data-cy="update-contract-parties"]').should('not.exist');
      });

      it('closes contract detail panel when clicking close button', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Panel should be visible
        cy.get('[data-cy="contract-detail-panel"]').should('be.visible');
        cy.get('[data-cy="close-contract-detail-wrapper"]').should('be.visible');

        // Click close button
        cy.get('[data-cy="close-contract-detail-wrapper"]').click();

        // Panel should be removed from DOM
        cy.get('[data-cy="contract-detail-panel"]').should('not.exist');
      });

      it('shows backdrop when contract detail panel is open', () => {
        cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
        navigateToContractOverview();

        cy.get('[data-cy="contract-row-0"]').click();

        // Modal wrapper (backdrop) should be visible
        cy.get('.sk-modal-wrapper').should('exist');
      });

      it('can click different contract rows to view different contracts', () => {
        // Use list with multiple contracts
        cy.intercept('GET', '**/contracts?*', mockContractsList).as('getContracts');
        navigateToContractOverview();

        // Click first row (lease agreement)
        cy.get('[data-cy="contract-row-0"]').click();
        cy.get('[data-cy="contract-detail-panel"]').contains('Arrende').should('be.visible');

        // Close panel
        cy.get('[data-cy="close-contract-detail-wrapper"]').click();
        cy.get('[data-cy="contract-detail-panel"]').should('not.exist');

        // Click third row (purchase agreement)
        cy.get('[data-cy="contract-row-2"]').click();
        cy.get('[data-cy="contract-detail-panel"]').contains('Köpeavtal').should('be.visible');
      });

      describe('Ändra faktureringsuppgifter button', () => {
        // Full errand data with all required fields for mapErrandToIErrand
        const errandData = {
          id: 999,
          errandNumber: 'MEX-2024-000999',
          caseType: 'MEX_OTHER',
          channel: 'WEB_UI',
          phase: 'Aktualisering',
          priority: 'MEDIUM',
          status: {
            statusType: 'Ärende inkommit',
            description: 'Ärende inkommit',
          },
          statuses: [],
          municipalityId: '2281',
          description: 'Ändra faktureringsuppgifter för avtal 2049-00010',
          stakeholders: [],
          extraParameters: [],
          notes: [],
          decisions: [],
          facilities: [],
          attachments: [],
          notifications: [],
          relatesTo: [],
          created: '2024-01-01T10:00:00.000Z',
          updated: '2024-01-01T10:00:00.000Z',
        };

        // POST /errands response needs data.data structure
        const mockCreatedErrandResponse = {
          data: errandData,
        };

        // GET /errand/:id response uses data.data structure
        const mockCreatedErrand = {
          data: errandData,
        };

        it('displays the Ändra faktureringsuppgifter button in contract detail panel', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();

          cy.get('[data-cy="contract-detail-edit-button"]')
            .should('be.visible')
            .and('contain.text', 'Ändra faktureringsuppgifter');
        });

        it('button is enabled when contract has contractId', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();

          cy.get('[data-cy="contract-detail-edit-button"]').should('not.be.disabled');
        });

        it('shows confirmation dialog when clicking the button', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Confirmation dialog should appear
          cy.contains('Ändra faktureringsuppgifter').should('be.visible');
          cy.contains('Vill du skapa ett nytt ärende för att ändra faktureringsuppgifter för avtal 2049-00010?').should(
            'be.visible'
          );
          cy.contains('Ja, skapa ärende').should('be.visible');
          cy.contains('Avbryt').should('be.visible');
        });

        it('does not create errand when clicking Avbryt in confirmation dialog', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          cy.intercept('POST', '**/errands', cy.spy().as('postErrandSpy')).as('postErrand');
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Click cancel button
          cy.contains('Avbryt').click();

          // Dialog should close
          cy.contains('Vill du skapa ett nytt ärende för att ändra faktureringsuppgifter').should('not.exist');

          // POST should not have been called
          cy.get('@postErrandSpy').should('not.have.been.called');
        });

        it('creates errand with correct data when confirming', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          cy.intercept('POST', '**/errands', mockCreatedErrandResponse).as('postErrand');
          cy.intercept('GET', /2281\/errand\/999/, mockCreatedErrand).as('getCreatedErrand');
          cy.intercept('PATCH', '**/errands/**/extraparameters', { data: [], message: 'ok' }).as(
            'patchExtraParameters'
          );
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Confirm the dialog
          cy.contains('Ja, skapa ärende').click();

          // Wait for the POST request and verify the data
          cy.wait('@postErrand').then((interception) => {
            expect(interception.request.body).to.have.property('caseType', 'MEX_OTHER');
            expect(interception.request.body).to.have.property('channel', 'WEB_UI');
            expect(interception.request.body).to.have.property('phase', 'Aktualisering');
            expect(interception.request.body).to.have.property('priority', 'MEDIUM');
            expect(interception.request.body.description).to.include('Ändra faktureringsuppgifter');
            expect(interception.request.body.description).to.include('2049-00010');

            // Verify stakeholders from contract are included
            const stakeholders = interception.request.body.stakeholders;
            expect(stakeholders).to.be.an('array');
            expect(stakeholders.length).to.be.greaterThan(0);

            // Verify LESSOR is mapped to GRANTOR
            const grantor = stakeholders.find((s: any) => s.roles?.includes('GRANTOR'));
            expect(grantor).to.exist;
            expect(grantor.organizationName).to.equal('Sundsvalls Kommun');

            // Verify LESSEE is mapped to LEASEHOLDER
            const leaseholders = stakeholders.filter((s: any) => s.roles?.includes('LEASEHOLDER'));
            expect(leaseholders.length).to.equal(2);
          });
        });

        it('saves contractId as extraParameter after creating errand', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          cy.intercept('POST', '**/errands', mockCreatedErrandResponse).as('postErrand');
          cy.intercept('GET', /2281\/errand\/999/, mockCreatedErrand).as('getCreatedErrand');
          cy.intercept('PATCH', '**/errands/**/extraparameters', { data: [], message: 'ok' }).as(
            'patchExtraParameters'
          );
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Confirm the dialog
          cy.contains('Ja, skapa ärende').click();

          // Wait for errand creation and fetch first
          cy.wait('@postErrand');
          cy.wait('@getCreatedErrand');

          // Wait for extraParameters PATCH and verify contractId is included
          cy.wait('@patchExtraParameters').then((interception) => {
            const extraParams = interception.request.body;
            const contractIdParam = extraParams.find((p: { key: string }) => p.key === 'contractId');
            expect(contractIdParam).to.exist;
            expect(contractIdParam.values).to.include('2049-00010');
          });
        });

        it('shows success toast and navigates to new errand after creation', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          cy.intercept('POST', '**/errands', mockCreatedErrandResponse).as('postErrand');
          cy.intercept('GET', /2281\/errand\/999/, mockCreatedErrand).as('getCreatedErrand');
          cy.intercept('PATCH', '**/errands/**/extraparameters', { data: [], message: 'ok' }).as(
            'patchExtraParameters'
          );
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Confirm the dialog
          cy.contains('Ja, skapa ärende').click();

          cy.wait('@postErrand');
          cy.wait('@getCreatedErrand');
          cy.wait('@patchExtraParameters');

          // Success toast should be shown
          cy.contains('Ärende skapat').should('be.visible');

          // Should navigate to the new errand page
          cy.url().should('include', '/arende/MEX-2024-000999');
        });

        it('shows error toast when errand creation fails', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          cy.intercept('POST', '**/errands', { statusCode: 500, body: { error: 'Server error' } }).as('postErrandFail');
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Confirm the dialog
          cy.contains('Ja, skapa ärende').click();

          cy.wait('@postErrandFail');

          // Error toast should be shown
          cy.contains('Något gick fel när ärendet skulle skapas').should('be.visible');
        });

        it('shows loading state while creating errand', () => {
          cy.intercept('GET', '**/contracts?*', mockContractDetailLeaseAgreement).as('getContracts');
          // Delay the response to observe loading state
          cy.intercept('POST', '**/errands', (req) => {
            req.reply({
              delay: 1000,
              body: mockCreatedErrandResponse,
            });
          }).as('postErrandDelayed');
          navigateToContractOverview();

          cy.get('[data-cy="contract-row-0"]').click();
          cy.get('[data-cy="contract-detail-edit-button"]').click();

          // Confirm the dialog
          cy.contains('Ja, skapa ärende').click();

          // Button should show loading state
          cy.get('[data-cy="contract-detail-edit-button"]').should('contain.text', 'Skapar ärende...');
          cy.get('[data-cy="contract-detail-edit-button"]').should('be.disabled');
        });
      });
    });
  });
});
