/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAddress } from 'cypress/e2e/case-data/fixtures/mockAddress';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockMexErrand_base, modifyField } from '../fixtures/mockMexErrand';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockEstatePropertyByDesignation } from '../fixtures/mockEstatePropertyByDesignation';
import { mockEstateInfo } from '../fixtures/mockEstateInfo';
import { mockEstateByAddress } from '../fixtures/mockEstateByAddress';
import { mockContract } from '../fixtures/mockContract';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand information tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/*', mockMessages);
      cy.intercept('POST', '**/messages', mockMessages);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe).as('mockMe');
      cy.intercept('GET', '**/parking-permits/', mockPermits);
      cy.intercept('GET', '**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/attachments\/errand\/\d*/, mockAttachments).as('getErrandAttachments');
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', '**/contract/2024-01026', mockContract).as('getContract');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('POST', '**/address', mockAddress).as('postAddress');
      cy.intercept('PATCH', '**/errands/*', mockMexErrand_base).as('patchErrand');
      cy.intercept('POST', '**/errands/*/facilities', mockMexErrand_base);
    });

    const goToErrandInformationTab = () => {
      cy.visit('/arende/2281/MEX-2024-000280');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('button').contains('Ärendeuppgifter').should('exist').click();
    };

    const checkEstateInfo = () => {
      cy.get('[data-cy="suggestion-list"]').should('exist');
      cy.get('[data-cy="searchHit-0"]').should('exist').click();
      cy.get('[data-cy="estate-table"').should('exist');
      cy.get('[data-cy="realEstate-0"]')
        .should('exist')
        .within(() => {
          cy.get('a').contains('Visa fastighetsinformation').click();
        });

      cy.get('[data-cy="estate-designation"]').should('exist').contains(mockEstateInfo.data?.designation);
      cy.get('[data-cy="ownership-tab"]').should('exist');
      cy.get('[data-cy="area-and-actions-tab"]').should('exist');
      cy.get('[data-cy="owner-name"]').should('exist').contains(mockEstateInfo.data?.ownership[0].owner.name);
      cy.get('[data-cy="owner-address"]').should('exist').contains(mockEstateInfo.data?.ownership[0].owner.address);
      cy.get('[data-cy="owner-postal-and-city"]')
        .should('exist')
        .contains(mockEstateInfo.data?.ownership[0].owner.city);

      cy.get('[data-cy="owner-share"]').should('exist');
      cy.get('[data-cy="owner-enrollment"]').should('exist');
      cy.get('[data-cy="owner-filenumber"]').should('exist');
      cy.get('[data-cy="estate-changes"]').should('exist');

      cy.get('[data-cy="area-and-actions-tab"]').click();
      cy.get('[data-cy="total-area"]').should('exist').contains(mockEstateInfo.data?.totalArea);
      cy.get('[data-cy="total-area-land"]').should('exist').contains(mockEstateInfo.data?.totalAreaLand);
      cy.get('[data-cy="total-area-water"]').should('exist').contains(mockEstateInfo.data?.totalAreaWater);

      cy.get('[data-cy="action-table"]').should('exist');
      cy.get('[data-cy="action-type"]').should('exist').contains(mockEstateInfo.data.actions[0].actionType1);
      cy.get('[data-cy="action-date"]').should('exist').contains(mockEstateInfo.data.actions[0].actionDate);
      cy.get('[data-cy="action-file-designation"]')
        .should('exist')
        .contains(mockEstateInfo.data.actions[0].fileDesignation);

      cy.get('[data-cy="close-estate-info-button"]').should('exist').click({ force: true });

      cy.get('[data-cy="remove-estate-0"]').should('exist').contains('Ta bort').click();
      cy.get('[data-cy="estate-table"]').should('exist').contains('Inga fastigheter tillagda');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();
    };

    it('search property designation', () => {
      cy.intercept('GET', '**/estateByPropertyDesignation/**', mockEstatePropertyByDesignation);
      cy.intercept('GET', '**/estateInfo/**', mockEstateInfo).as('getEstateInfo');
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          facilities: [],
        })
      ).as('getErrand');
      goToErrandInformationTab();

      cy.get('[data-cy="facility-search"]').should('exist').type('sundsvall');

      checkEstateInfo();
    });

    it('search address', () => {
      cy.intercept('GET', '**/estateByAddress/**', mockEstateByAddress);
      cy.intercept('GET', '**/estateInfo/**', mockEstateInfo).as('getEstateInfo');
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          facilities: [],
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="radio-button-group"]')
        .should('exist')
        .each(() => {
          cy.get('[data-cy="search-address-radio-button"]').should('exist').check();
        });
      cy.get('[data-cy="facility-search"]').should('exist').type('Testvägen 1');

      checkEstateInfo();
    });

    it('case MEX_EARLY_DIALOG_PLAN_NOTIFICATION', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_EARLY_DIALOG_PLAN_NOTIFICATION',
        })
      ).as('getErrand');

      goToErrandInformationTab();
    });

    it('case MEX_LEASE_REQUEST', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_LEASE_REQUEST',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="reason-textarea"]').should('exist').type('Mock text 1');
      cy.get('[data-cy="fromDate-input"]').should('exist').type('2024-06-30');
      cy.get('[data-cy="toDate-input"]').should('exist').type('2024-07-30');
      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text 2');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.reason).to.equal('Mock text 1');
        expect(request.body.extraParameters.fromDate).to.equal('2024-06-30');
        expect(request.body.extraParameters.toDate).to.equal('2024-07-30');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text 2');
      });
    });

    it('case MEX_BUY_LAND_FROM_THE_MUNICIPALITY', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_BUY_LAND_FROM_THE_MUNICIPALITY',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="errandInformation-textarea"]').should('exist').type('Mock text 1');
      cy.get('[data-cy="typeOfEstablishment-textarea"]').should('exist').type('Mock text 2');
      cy.get('[data-cy="jobOpportunities-textarea"]').should('exist').type('Mock text 3');
      cy.get('[data-cy="constructionOfBuildings-textarea"]').should('exist').type('Mock text 4');
      cy.get('[data-cy="landArea-input"]').should('exist').type('Mock text 5');
      cy.get('[data-cy="electricity-input"]').should('exist').type('Mock text 6');
      cy.get('[data-cy="timetable-input"]').should('exist').type('2024-06-15');
      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text 7');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.errandInformation).to.equal('Mock text 1');
        expect(request.body.extraParameters.typeOfEstablishment).to.equal('Mock text 2');
        expect(request.body.extraParameters.jobOpportunities).to.equal('Mock text 3');
        expect(request.body.extraParameters.constructionOfBuildings).to.equal('Mock text 4');
        expect(request.body.extraParameters.landArea).to.equal('Mock text 5');
        expect(request.body.extraParameters.electricity).to.equal('Mock text 6');
        expect(request.body.extraParameters.timetable).to.equal('2024-06-15');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text 7');
      });
    });

    it('case MEX_SELL_LAND_TO_THE_MUNICIPALITY', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_SELL_LAND_TO_THE_MUNICIPALITY',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="reason-textarea"]').should('exist').type('Mock text 1');
      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text 2');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.reason).to.equal('Mock text 1');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text 2');
      });
    });

    it('case MEX_APPLICATION_SQUARE_PLACE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_APPLICATION_SQUARE_PLACE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="taxBill_request-select"]').should('exist').select(1);
      cy.get('[data-cy="location_1-input"]').should('exist').type('Torget 1');
      cy.get('[data-cy="location_2-input"]').should('exist').type('Torget 2');
      cy.get('[data-cy="location_3-input"]').should('exist').type('Torget 3');
      cy.get('[data-cy="occasion1@fromDate-input"]').should('exist').type('2024-06-15');
      cy.get('[data-cy="occasion1@toDate-input"]').should('exist').type('2024-06-16');
      cy.get('[data-cy="occasion2@fromDate-input"]').should('exist').type('2024-07-15');
      cy.get('[data-cy="occasion2@toDate-input"]').should('exist').type('2024-07-16');
      cy.get('[data-cy="occasion3@fromDate-input"]').should('exist').type('2024-08-15');
      cy.get('[data-cy="occasion3@toDate-input"]').should('exist').type('2024-08-16');
      cy.get('[data-cy="occasion4@fromDate-input"]').should('exist').type('2024-09-15');
      cy.get('[data-cy="occasion4@toDate-input"]').should('exist').type('2024-09-16');
      cy.get('[data-cy="occasion5@fromDate-input"]').should('exist').type('2024-10-15');
      cy.get('[data-cy="occasion5@toDate-input"]').should('exist').type('2024-10-16');

      cy.get('[data-cy="electricity-radio-button-group"]').should('exist');
      cy.get('[data-cy="electricity-radio-button-0"]').should('have.value', 'Ja').check();

      cy.get('[data-cy="water_sewage-radio-button-group"]').should('exist');
      cy.get('[data-cy="water_sewage-radio-button-0"]').should('have.value', 'Ja').check();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.location_1).to.equal('Torget 1');
        expect(request.body.extraParameters.location_2).to.equal('Torget 2');
        expect(request.body.extraParameters.location_3).to.equal('Torget 3');

        expect(request.body.extraParameters['occasion1.fromDate']).to.equal('2024-06-15');
        expect(request.body.extraParameters['occasion1.toDate']).to.equal('2024-06-16');
        expect(request.body.extraParameters['occasion2.fromDate']).to.equal('2024-07-15');
        expect(request.body.extraParameters['occasion2.toDate']).to.equal('2024-07-16');
        expect(request.body.extraParameters['occasion3.fromDate']).to.equal('2024-08-15');
        expect(request.body.extraParameters['occasion3.toDate']).to.equal('2024-08-16');
        expect(request.body.extraParameters['occasion4.fromDate']).to.equal('2024-09-15');
        expect(request.body.extraParameters['occasion4.toDate']).to.equal('2024-09-16');
        expect(request.body.extraParameters['occasion5.fromDate']).to.equal('2024-10-15');
        expect(request.body.extraParameters['occasion5.toDate']).to.equal('2024-10-16');

        expect(request.body.extraParameters.electricity).to.equal('Ja');
        expect(request.body.extraParameters.water_sewage).to.equal('Ja');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_BUY_SMALL_HOUSE_PLOT', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_BUY_SMALL_HOUSE_PLOT',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_APPLICATION_FOR_ROAD_ALLOWANCE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="applicantType-radio-button-group"]').should('exist');
      cy.get('[data-cy="applicantType-radio-button-0"]').should('have.value', 'Privatperson').check();
      cy.get('[data-cy="applicantType-radio-button-1"]').should('have.value', 'Representant för förening');

      cy.get('[data-cy="roadType-radio-button-group"]').should('exist');
      cy.get('[data-cy="roadType-radio-button-0"]').should('have.value', 'Enskild väg med statsbidrag');
      cy.get('[data-cy="roadType-radio-button-1"]').should('have.value', 'Enskild väg UTAN statsbidrag').check();

      cy.get('[data-cy="registrationAddressStatus-radio-button-group"]').should('exist');
      cy.get('[data-cy="registrationAddressStatus-radio-button-0"]').should('have.value', 'Ja jag är folkbokförd');
      cy.get('[data-cy="registrationAddressStatus-radio-button-1"]')
        .should('have.value', 'Nej jag är inte folkbokförd')
        .check();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="account@type-radio-button-group"]').should('exist');
      cy.get('[data-cy="account@type-radio-button-0"]').should('have.value', 'Bankgiro');
      cy.get('[data-cy="account@type-radio-button-1"]').should('have.value', 'Plusgiro');
      cy.get('[data-cy="account@type-radio-button-2"]').should('have.value', 'Bankkonto').check();

      cy.get('[data-cy="account@bank-input"]').should('exist').type('Testbank');
      cy.get('[data-cy="account@owner-input"]').should('exist').type('Test Testarsson');
      cy.get('[data-cy="account@ownerIdentifier-input"]').should('exist').type(Cypress.env('mockPersonNumber'));
      cy.get('[data-cy="account@number-input"]').should('exist').type('1234567890');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters['otherInformation']).to.equal('Mock text');
        expect(request.body.extraParameters['propertyDesignation']).to.equal('Test property');
        expect(request.body.extraParameters['registrationAddressStatus']).to.equal('Nej jag är inte folkbokförd');
        expect(request.body.extraParameters['roadType']).to.equal('Enskild väg UTAN statsbidrag');

        expect(request.body.extraParameters['account.bank']).to.equal('Testbank');
        expect(request.body.extraParameters['account.owner']).to.equal('Test Testarsson');
        expect(request.body.extraParameters['account.ownerIdentifier']).to.equal(Cypress.env('mockPersonNumber'));
        expect(request.body.extraParameters['account.type']).to.equal('Bankkonto');
      });
    });

    it('case MEX_UNAUTHORIZED_RESIDENCE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_UNAUTHORIZED_RESIDENCE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_LAND_RIGHT', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_LAND_RIGHT',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_PROTECTIVE_HUNTING', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_PROTECTIVE_HUNTING',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="sightingLocation-textarea"]').should('exist').type('Mock text 1');
      cy.get('[data-cy="sightingTime-input"]').should('exist').type('2024-06-05T10:00');

      cy.get('[data-cy="urgent-radio-button-group"]').should('exist');
      cy.get('[data-cy="urgent-radio-button-0"]').should('have.value', 'Ja').check();
      cy.get('[data-cy="urgent-radio-button-1"]').should('have.value', 'Nej');

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text 2');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.id).to.equal(mockMexErrand_base.data.id.toString());
        expect(request.body.extraParameters.sightingLocation).to.equal('Mock text 1');
        expect(request.body.extraParameters.sightingTime).to.equal('2024-06-05T10:00');
        expect(request.body.extraParameters.urgent).to.equal('Ja');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text 2');
      });
    });

    it('case MEX_LAND_INSTRUCTION', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_LAND_INSTRUCTION',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_OTHER', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_OTHER',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_LAND_SURVEYING_OFFICE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_LAND_SURVEYING_OFFICE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_INVOICE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_INVOICE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="invoiceNumber-input"]').should('exist').type('12345');
      cy.get('[data-cy="invoiceRecipient-input"]').should('exist').type('Test Testarsson');
      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.invoiceNumber).to.equal('12345');
        expect(request.body.extraParameters.invoiceRecipient).to.equal('Test Testarsson');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_REQUEST_FOR_PUBLIC_DOCUMENT', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_REQUEST_FOR_PUBLIC_DOCUMENT',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text');
      });
    });

    it('case MEX_TERMINATION_OF_LEASE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_TERMINATION_OF_LEASE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="reason-radio-button-group"]').should('exist');
      cy.get('[data-cy="reason-radio-button-0"]').should('have.value', 'Jag behöver inte använda marken längre');
      cy.get('[data-cy="reason-radio-button-1"]').should('have.value', 'Jag har flyttat').check();
      cy.get('[data-cy="reason-radio-button-2"]').should('have.value', 'Arrendatorn har avlidit');

      cy.get('[data-cy="reason@other-textarea"]').should('exist').type('Mock text 1');
      cy.get('[data-cy="fromDate-input"]').should('exist').type('2024-06-05');
      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text 2');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.reason).to.equal('Jag har flyttat');
        expect(request.body.extraParameters['reason.other']).to.equal('Mock text 1');
        expect(request.body.extraParameters.fromDate).to.equal('2024-06-05');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text 2');
      });
    });

    it('case MEX_TERMINATION_OF_HUNTING_LEASE', () => {
      cy.intercept(
        'GET',
        '**/errand/errandNumber/*',
        modifyField(mockMexErrand_base, {
          caseType: 'MEX_TERMINATION_OF_HUNTING_LEASE',
        })
      ).as('getErrand');

      goToErrandInformationTab();

      cy.get('[data-cy="reason-textarea"]').should('exist').type('Mock text 1');
      cy.get('[data-cy="fromDate-input"]').should('exist').type('2024-06-05');
      cy.get('[data-cy="otherInformation-textarea"]').should('exist').type('Mock text 2');

      cy.get('[data-cy="save-errand-information-button"]').should('exist').click();
      cy.get('button').should('exist').contains('Ja').click();

      cy.wait('@patchErrand').should(({ request }) => {
        expect(request.body.extraParameters.reason).to.equal('Mock text 1');
        expect(request.body.extraParameters.fromDate).to.equal('2024-06-05');
        expect(request.body.extraParameters.otherInformation).to.equal('Mock text 2');
      });
    });
  });
});
