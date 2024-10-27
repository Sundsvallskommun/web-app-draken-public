/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockContract } from '../fixtures/mockContract';
import { modifyField } from '../fixtures/mockErrand';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand page contracts tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/MEX-2024-000280*', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', /\/attachments\/errand\/\d*/, mockAttachments).as('getErrandAttachments');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/contract/2024-01026', {
        data: {
          contractId: '2024-01026',
          type: 'LAND_LEASE',
          stakeholders: mockMexErrand_base.data.stakeholders,
          indexTerms: [],
        },
      }).as('getContract');
      cy.intercept('PUT', '**/contract/2024-01026', contractText).as('putContract');
      cy.intercept('POST', '**/contract', contractText).as('postLandLeaseContract');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', '**/stakeholders/personNumber').as('getStakeholders');
      cy.visit(`/arende/${mockMexErrand_base.data.municipalityId}/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrand');
      cy.wait('@getContract');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs .sk-menubar button').eq(3).should('have.text', `Avtal`).click({ force: true });

      cy.get('[data-cy="apartmentType"]').should('exist').check();
    });

    const contractText = {
      data: {
        contractId: '2024-01026',
        externalReferenceId: '123123',
        status: 'ACTIVE',
        propertyDesignations: ['SUNDSVALL BLA'],
        type: 'LAND_LEASE',
      },
    };

    it('can upload signed contract', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.intercept(
        'POST',
        `**/contracts/${mockMexErrand_base.data.municipalityId}/${contractText.data.contractId}/attachments`,
        {}
      );

      cy.get('[data-cy="preview-contract"]').should('exist');

      cy.get('button').should('exist').contains('Ladda upp signerat avtal (pdf)').click();
      cy.get('button').contains('Bläddra').should('exist').click();
      cy.get('input[type=file]').selectFile('cypress/e2e/case-data/files/testpdf.pdf', { force: true });
      cy.get('select[data-cy="attachmentType"]').should('exist').select(1);
      cy.get('.sk-modal-footer button.sk-btn-primary').should('exist').contains('Ladda upp').click();
      cy.get('.sk-snackbar').contains('Bilagan sparades').should('exist');
    });

    it('shows the correct contracts information', () => {
      const landLeaseType = [
        { key: 'parties', label: 'Parter' },
        { key: 'area', label: 'Område' },
        { key: 'purpose', label: 'Ändamål' },
        { key: 'arrendetid', label: 'Arrendetid och uppsägning' },
        { key: 'arrendeavgift', label: 'Arrendeavgift' },
        { key: 'bygglov', label: 'Bygglov och tillstånd' },
        { key: 'subletting', label: 'Överlåtelse och underupplåtelse' },
        { key: 'inskrivning', label: 'Inskrivning' },
        { key: 'skick', label: 'Skick och skötsel' },
        { key: 'ledningar', label: 'Ledningar' },
        { key: 'expenses', label: 'Kostnader' },
        { key: 'pollution', label: 'Markföroreningar' },
        { key: 'upphorande', label: 'Upphörande och återställning' },
        { key: 'damages', label: 'Skada och ansvar' },
        { key: 'special', label: 'Särskilda bestämmelser' },
        { key: 'jordabalk', label: 'Hänvisning till Jordabalken' },
      ];

      //land lease contracts
      landLeaseType.forEach((type) => {
        cy.get(`[data-cy="badge-${type.key}"]`).contains(type.label).should('exist');
      });

      cy.get('[data-cy="parties-disclosure"]').contains('Parter').should('exist');
      cy.get('[data-cy="area-disclosure"]').contains('Område').should('exist');
      cy.get('[data-cy="purpose-disclosure"]').contains('Ändamål').should('exist');
      cy.get('[data-cy="tenancy-period-disclosure"]').contains('Arrendetid och uppsägning').should('exist');
      cy.get('[data-cy="lease-fee-disclosure"]').contains('Arrendeavgift').should('exist');
      cy.get('[data-cy="building-permits-disclosure"]').contains('Bygglov och tillstånd').should('exist');
      cy.get('[data-cy="assignment-subassignment-disclosure"]')
        .contains('Överlåtelse och underupplåtelse')
        .should('exist');
      cy.get('[data-cy="enrollment-disclosure"]').contains('Inskrivning').should('exist');
      cy.get('[data-cy="condition-care-disclosure"]').contains('Skick och skötsel').should('exist');
      cy.get('[data-cy="wires-disclosure"]').contains('Ledningar').should('exist');
      cy.get('[data-cy="costs-disclosure"]').contains('Kostnader').should('exist');
      cy.get('[data-cy="soil-pollution-disclosure"]').contains('Markföroreningar').should('exist');
      cy.get('[data-cy="termination-reinstatement-disclosure"]')
        .contains('Upphörande och återställning')
        .should('exist');
      cy.get('[data-cy="damages-disclosure"]').contains('Skada och ansvar').should('exist');
      cy.get('[data-cy="special-provisions-disclosure"]').contains('Särskilda bestämmelser').should('exist');
      cy.get('[data-cy="soilbeam-disclosure"]').contains('Hänvisning till Jordabalken').should('exist');
    });

    //PARTIES
    it('manages parties in land lease contracts', () => {
      cy.get('[data-cy="parties-disclosure"]').should('exist');
      cy.get('[data-cy="grantor-table"] .sk-table-tbody-tr')
        .should('exist')
        .contains(
          `${mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('PROPERTY_OWNER')).firstName} ${
            mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('PROPERTY_OWNER')).lastName
          }`
        );

      cy.get('[data-cy="leaseholder-table"] .sk-table-tbody-tr')
        .should('exist')
        .contains(
          `${mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('LEASEHOLDER')).firstName} ${
            mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('LEASEHOLDER')).lastName
          }`
        );
      cy.get('[data-cy="parties-disclosure"] button.sk-btn-tertiary[aria-expanded="true"]').should('exist').click();
    });

    //MANUAL TEXTAREA INPUT IN ALL DISCLOSURES
    it('manages disclosure inputs manually in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/contract/2024-01026', modifyField(mockContract, { type: 'LAND_LEASE' })).as(
        'getContract'
      );

      const dataCys = [
        'area',
        'purpose',
        'tenancy-period',
        'lease-fee',
        'building-permits',
        'assignment-subassignment',
        'enrollment',
        'condition-care',
        'wires',
        'costs',
        'soil-pollution',
        'termination-reinstatement',
        'damages',
        'special-provisions',
        'soilbeam',
        'signature',
      ];

      dataCys.forEach((datacy) => {
        const inputtext = 'Skriver ett villkor';
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-tertiary`).should('exist').click();
        cy.get(`[data-cy="${datacy}-richtext-wrapper"] .ql-editor[contenteditable="false"]`).should('exist');
        cy.get(`[data-cy="manual-text-checkbox-${datacy}"]`).should('exist').check({ force: true });
        cy.get(`[data-cy="${datacy}-richtext-wrapper"] .ql-editor[contenteditable="true"]`)
          .should('exist')
          .type(inputtext);
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-primary`).contains('Spara').should('exist').click();
        cy.wait('@getErrand');
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-tertiary`).should('exist').click();
      });

      // Manual textarea input in Additional terms disclosure
      cy.get('[data-cy="additional-terms-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="additional-terms-heading"]').should('exist').type('Villkor');
      cy.get('[data-cy="additional-terms-richtext-wrapper"]').should('exist').type('Beskrivning av villkor');
      cy.get('[data-cy="additional-terms-disclosure"] button.sk-btn-primary').should('exist').contains('Spara').click();
      cy.intercept('@putContract');
      cy.wait('@getErrand');
      cy.get(`[data-cy="additional-terms-disclosure"] button.sk-btn-tertiary`).should('exist').click();
    });

    //AREA
    it('manages area automatically in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').contains('Fyll i villkor').should('exist').click();
      cy.get('.sk-modal-dialog').should('exist');

      // Is not in use right now
      // cy.get('[data-cy="areacheck-group"] [type="radio"]').eq(0).should('exist').check();
      // cy.get('[data-cy="areacheck-group"] [type="radio"]').eq(1).should('exist').check();
      cy.get('[data-cy="property-designation-check"]').should('exist').check({ force: true });

      cy.get('#areaSize').should('exist').type('200');
      cy.get('#mapAttachments').should('exist').type('mapattachment.txt');
      // Is not in use right now
      // cy.get('#mapAttachmentReference').should('exist').type('map reference');

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      // Is not in use right now
      // cy.get('[data-cy="area-richtext-wrapper"] .ql-editor[contenteditable="false"]')
      //   .should('exist')
      //   .contains('map reference');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="area-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //PURPOSE
    it('manages purpose automatically in land lease contracts', () => {
      const purposeTerms = [
        {
          key: 'andamalTerms.condition.byggnad',

          header: 'Byggnad',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.batplats',

          header: 'Båtplats',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.idrattsandamal',

          header: 'Idrottsändamål',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.led',

          header: 'Led',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.parkering',

          header: 'Parkering',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.skylt',

          header: 'Skylt',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.snotipp',

          header: 'Snötipp',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.tomtkomplement',

          header: 'Tomtkomplement',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.upplag',

          header: 'Upplag',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.uppstallning',

          header: 'Uppställning',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.ytjordvarme',

          header: 'Ytjordvärme',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.vag',

          header: 'Väg',
          conditionText: '',
        },
        {
          key: 'andamalTerms.condition.atervinningsstation',

          header: 'Återvinningsstation',
          conditionText: '',
        },
      ];
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="purpose-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="purpose-disclosure"] button.sk-btn-primary').contains('Fyll i villkor').should('exist').click();
      cy.get('.sk-modal-dialog').should('exist');

      purposeTerms.forEach((p) => {
        cy.get(`[data-cy="purpose-term-${p.header}"]`).should('exist').check({ force: true });
      });

      // Is not in use right now
      // cy.get('#purposeOtherInformation').should('exist').type('Clarification text');
      // cy.get('[data-cy="bygglov-checkgroup"] [type="radio"]').eq(0).should('exist').check();
      // cy.get('[data-cy="bygglov-checkgroup"] [type="radio"]').eq(1).should('exist').check();
      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="purpose-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="purpose-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="purpose-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //TENANCY PERIOD
    it('manages tenancy period automatically in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="tenancy-period-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="tenancy-period-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('#startDate[type="date"]').should('exist').type(new Date().toLocaleDateString());
      cy.get('#endDate[type="date"]').should('exist').type(new Date().toLocaleDateString());

      cy.get('select#noticePeriod').should('exist').select(1);
      cy.get('select#autoRenewal').should('exist').select(1);

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="tenancy-period-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="tenancy-period-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="tenancy-period-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //LEASE FEE
    it('manages lease fee automatically in land lease contracts', () => {
      const rows = ['yearly', 'byYear', 'byLease', 'previouslyPaid', 'indexAdjustedFee'];
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="lease-fee-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="lease-fee-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="lease-fee-table"] .sk-table-tbody-tr').should('have.length', rows.length);
      rows.forEach((r) => {
        cy.get(`[data-cy="${r}-row"] [type="checkbox"]`).should('exist').should('have.value', r).check({ force: true });
        if (r !== rows[4] && r !== rows[3]) {
          cy.get(`[data-cy="${r}-row"] [type="text"]`).should('exist').type('1200');
        } else if (r === rows[4]) {
          cy.get(`[data-cy="${r}-row"] select#noticePeriod`).should('not.be.disabled').select(2);
          cy.get(`[data-cy="${r}-row"] [type="text"]`).should('exist').clear().type('1200');
        }

        cy.get('[data-cy="paymentPeriod"] [type="radio"]').eq(0).should('have.value', 'year').check();
        cy.get('[data-cy="paymentPeriod"] [type="radio"]').eq(1).should('have.value', 'quarter').check();

        cy.get('[data-cy="paymentMode"] [type="radio"]').eq(0).should('have.value', 'pre').check();
        cy.get('[data-cy="paymentMode"] [type="radio"]').eq(1).should('have.value', 'post').check();
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="lease-fee-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="lease-fee-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="lease-fee-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //BUILDING PERMITS
    it('manages building permits automatically in land lease contracts', () => {
      const buildPermits = [
        {
          key: 'bygglovTerms.condition.permitFees',
          header: 'Arrendator står för tillståndskostnader',
          conditionText:
            'Arrendatorn är skyldig att skaffa och bekosta de tillstånd som krävs för verksamheten på området. Föreskrifter som meddelas av myndighet eller som följer av lag ska följas.',
        },
        {
          key: 'bygglovTerms.condition.buildingOwnership',
          header: 'Arrendator äger byggnader som står inom området',
          conditionText: 'Arrendatorn äger byggnader som står inom området, bygglov beviljat enligt BYGG 20XX – XXXX',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="building-permits-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="building-permits-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="buildPermits-table"] .sk-table-tbody-tr').should('have.length', buildPermits.length);
      buildPermits.forEach((b) => {
        cy.get(`[data-cy="buildPermits-table"] .sk-table-tbody-tr [data-cy="${b.key}-checkbox"]`)
          .contains(b.header)
          .should('exist');
        cy.get(`[data-cy="buildPermits-table"] .sk-table-tbody-tr [data-cy='${b.key}-checkbox'] [type="checkbox"]`)
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="building-permits-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="building-permits-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="building-permits-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //CONDITION CARE
    it('manages condition and care automatically in land lease contracts', () => {
      const conditionsCare = [
        {
          key: 'skickTerms.condition.nuisance',
          header: 'Ansvar för undvikande av olägenhet',
          conditionText:
            'Området upplåts i befintligt skick. Det åligger arrendatorn att hålla området i städat och vårdat skick och hålla god ordning i sin verksamhet inom området. Arrendatorn ska tillse att den verksamhet han bedriver inom området inte på något vis medför olägenhet för grannar eller någon annan samt för andra verksamheter i anslutning till området.',
        },
        {
          key: 'skickTerms.condition.accessibility',
          header: 'Skyldighet att upprätthålla framkomlighet för allmänheten',
          conditionText:
            'Arrendatorn är skyldig att bedriva sin verksamhet inom området så den inte hindrar allmänhetens framkomlighet intill arrendeområdet.',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="condition-care-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="condition-care-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="conditionsCare-table"] .sk-table-tbody-tr').should('have.length', conditionsCare.length);
      conditionsCare.forEach((b) => {
        cy.get('[data-cy="conditionsCare-table"] .sk-table-tbody-tr .sk-form-checkbox-label')
          .contains(b.header)
          .should('exist');
        cy.get('[data-cy="conditionsCare-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="condition-care-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="condition-care-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="condition-care-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //COSTS
    it('manages costs automatically in land lease contracts', () => {
      const costs = [
        {
          key: 'kostnaderTerms.condition.kostnader',

          header: 'Arrendatorn ansvarar för avgifter, drift och övriga kostnader som krävs för områdets nyttjande.',
          conditionText: '',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="costs-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="costs-disclosure"] button.sk-btn-primary').contains('Fyll i villkor').should('exist').click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="costs-table"] .sk-table-tbody-tr').should('have.length', costs.length);
      costs.forEach((b) => {
        cy.get('[data-cy="costs-table"] .sk-table-tbody-tr .sk-form-checkbox-label').contains(b.header).should('exist');
        cy.get('[data-cy="costs-table"] .sk-table-tbody-tr [type="checkbox"]').should('exist').check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="costs-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="costs-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="costs-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //SOIL POLLUTION
    it('manages soil and pollution automatically in land lease contracts', () => {
      const soilPollution = [
        {
          key: 'markfororeningarTerms.condition.pollutionAvoidance',
          header: 'Ansvar för undvikande av föroreningar enligt Miljöbalken',
          conditionText:
            'Arrendatorn påminns om att som verkamhetsutövare är det dennes ansvar, enligt miljöbalkens bestämmelser, att tillse att ev. schaktmassor eller annat material som tillförs området inte innehåller någon förorening till skada för mark och vatten.',
        },
        {
          key: 'markfororeningarTerms.condition.verificationResponsibility',
          header: 'Ansvar för verifiering av föroreningsfri mark',
          conditionText:
            'Arrendatorn ansvarar att på egen bekostnad och genom markundersökningar kunna verifiera att området lämnas fritt från markföroreningar.',
        },
        {
          key: 'markfororeningarTerms.condition.testDone',
          header: 'Miljöprovtagning och rapport',
          conditionText:
            'Miljöprovtagning av området är utförd [[2024-XX-XX]]. Arrendatorn har tagit del av provtagningsrapporten.',
        },
        {
          key: 'markfororeningarTerms.condition.testingAtEnd',
          header: 'Krav på miljöprovtagning och provtagningplan vid avtalets upphörande',
          conditionText:
            'Det är arrendatorns skyldighet att visa att området lämnas fritt från föroreningar. Miljöprovtagning av området ska utföras i samband med att arrendet upphör om fastighetsägaren så kräver. En provtagningsplan ska inlämnas till fastighetsägaren för godkännande innan provtagning sker. Provtagningen bekostas av arrendatorn.',
        },
        {
          key: 'markfororeningarTerms.condition.testingAtTransfer',
          header: 'Rekommendation om provtagning vid tillträde',
          conditionText:
            'Fastighetsägaren rekommenderar att en provtagning av området görs vid tillträdet. En provtagningsplan ska inlämnas till fastighetsägaren för godkännande innan provtagning sker. Provtagningen bekostas av arrendatorn.',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="soilPollution-table"] .sk-table-tbody-tr').should('have.length', soilPollution.length);
      soilPollution.forEach((b) => {
        cy.get('[data-cy="soilPollution-table"] .sk-table-tbody-tr .sk-form-checkbox-label')
          .contains(b.header)
          .should('exist');
        cy.get('[data-cy="soilPollution-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="soil-pollution-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //TERMINATION AND REINSTATEMENT
    it('manages termination reinstatement automatically in land lease contracts', () => {
      const terminationReinstatement = [
        {
          key: 'upphorandeTerms.condition.restorationCleaning',
          header: 'Återställning och städning',
          conditionText:
            'Vid avtalets upphörande ska arrendatorn lämna området väl avstädat och återställt i skick som kan godkännas av fastighetsägaren. Om så inte sker kommer fastighetsägaren att ombesörja avstädningen på arrendatorns bekostnad. Detta gäller även om arrendatorn har avflyttat från den i detta avtal angivna adressen',
        },
        {
          key: 'upphorandeTerms.condition.restorationBuildingRemoval',
          header: 'Återställning och borttagning av byggnader',
          conditionText:
            'Vid avtalets upphörande ska arrendatorn lämna området väl avstädat och återställt i skick som kan godkännas av fastighetsägaren. Alla byggnader/anläggningar inom området ska tas bort. Om så inte sker kommer fastighetsägaren att ombesörja avstädningen på arrendatorns bekostnad. Detta gäller även om arrendatorn har avflyttat från den i detta avtal angivna adressen',
        },
        {
          key: 'upphorandeTerms.condition.noRefundLeaseFee',
          header: 'Ingen återbetalning av arrendeavgift vid förtida upphörande',
          conditionText:
            'Om arrendeavtalet upphör i förtid, oavsett anledning, återbetalas inte erlagd arrendeavgift understigande 750 kr',
          extraField: {
            key: 'upphorandeTerms.noRefundLeaseFeeAmount',
            placeholder: 'SEK',
            header: 'Ange belopp för återbetalning',
          },
        },
        {
          key: 'upphorandeTerms.condition.inspectionRequirements',
          header: 'Besiktningskrav och friskrivning av ersättningsskyldighet',
          conditionText:
            'Vid avtalets upphörande ska arrendatorn kalla fastighetsägaren till besiktning av området. Fastighetsägaren friskriver sig från eventuell skyldighet att vid avtalets upphörande ersätta arrendatorn dels med annat markområde, dels för kostnader som arrendatorn nedlagt inom området',
        },
        {
          key: 'upphorandeTerms.condition.inspectionLandWater',
          header: 'Besiktning och friskrivning för mark- och vattenområden',
          conditionText:
            'Vid avtalets upphörande ska arrendatorn kalla fastighetsägaren till besiktning av området. Fastighetsägaren friskriver sig från eventuell skyldighet att vid avtalets upphörande ersätta arrendatorn dels med annat mark- och vattenområde, dels för kostnader som arrendatorn nedlagt inom området',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="termination-reinstatement-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="termination-reinstatement-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="terminationReinstatement-table"] .sk-table-tbody-tr').should(
        'have.length',
        terminationReinstatement.length
      );
      terminationReinstatement.forEach((b) => {
        cy.get('[data-cy="terminationReinstatement-table"] .sk-table-tbody-tr .sk-form-checkbox-label')
          .contains(b.header)
          .should('exist');
        cy.get('[data-cy="terminationReinstatement-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="termination-reinstatement-richtext-wrapper"] .ql-editor[contenteditable="false"]').should(
        'exist'
      );

      cy.get('[data-cy="termination-reinstatement-disclosure"] button.sk-btn-primary')
        .contains('Spara')
        .should('exist')
        .click();
      cy.wait('@getErrand');

      cy.get('[data-cy="termination-reinstatement-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //DAMAGES
    it('manages damages automatically in land lease contracts', () => {
      const damages = [
        {
          key: 'skadaansvarTerms.condition.skadeaterstallning',
          header: 'Skadeåterställning och kostnadsansvar för arrendatorn',
          conditionText:
            'Arrendatorn ska för det fall det uppstår skador till följd av arrendatorns nyttjande av området ombesörja och bekosta återställande av skador. Fastighetsägaren äger annars rätt att vidta nödvändiga åtgärder på arrendatorns bekostnad.',
        },
        {
          key: 'skadaansvarTerms.condition.skadestandsskyldighet',
          header: 'Skadeståndsskyldighet och skydd mot tredjepartsanspråk för arrendatorn',
          conditionText:
            'Arrendatorn ska hålla fastighetsägaren fullt ut skadeslös för eventuella krav eller anspråk från myndighet eller tredje man till följd av den verksamhet arrendatorn bedriver på området, inklusive ansvar avseende miljöskada.',
        },
        {
          key: 'skadaansvarTerms.condition.befrielse',
          header: 'Befrielse från ansvar för fastighetsägaren vid myndighetsåtgärder',
          conditionText:
            'Fastighetsägaren svarar inte för olägenhet eller kostnader som orsakas arrendatorn till följd av myndighetsåtgärder eller liknande.',
        },
        {
          key: 'skadaansvarTerms.condition.begransning',
          header: 'Begränsning av fastighetsägarens ansvar för skador och krav mot arrendatorn',
          conditionText:
            'Fastighetsägaren är inte ansvarig för skada på arrendestället eller arrendatorn tillhörig egendom som orsakas av markens beskaffenhet, grundvattenförändringar, tredje man eller allmänheten. Om krav skulle riktas mot arrendatorns verksamhet ska arrendatorn skyndsamt underrätta fastighetsägaren om detta.',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="damages-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="damages-disclosure"] button.sk-btn-primary').contains('Fyll i villkor').should('exist').click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="damages-table"] .sk-table-tbody-tr').should('have.length', damages.length);
      damages.forEach((d) => {
        cy.get('[data-cy="damages-table"] .sk-table-tbody-tr .sk-form-checkbox-label')
          .contains(d.header)
          .should('exist');
        cy.get('[data-cy="damages-table"] .sk-table-tbody-tr [type="checkbox"]').should('exist').check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="damages-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="damages-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="damages-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //SPECIAL PROVISIONS
    it('manages special provisions automatically in land lease contracts', () => {
      const specialProvisions = [
        {
          key: 'sarskildaTerms.condition.sarskilda',

          header: 'Området får inte inhägnas eller bebyggas med någon form av byggnader.',
          conditionText: '',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="special-provisions-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="special-provisions-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="special-provisions-table"] .sk-table-tbody-tr').should('have.length', specialProvisions.length);
      specialProvisions.forEach((s) => {
        cy.get('[data-cy="special-provisions-table"] .sk-table-tbody-tr .sk-form-checkbox-label')
          .contains(s.header)
          .should('exist');
        cy.get('[data-cy="special-provisions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="special-provisions-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="special-provisions-disclosure"] button.sk-btn-primary')
        .contains('Spara')
        .should('exist')
        .click();
      cy.wait('@getErrand');

      cy.get('[data-cy="special-provisions-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //SOIL BEAM
    it('manages soilbeam automatically in land lease contracts', () => {
      const soilBeam = [
        {
          key: 'jordabalkenTerms.condition.jordabalken',

          header: 'I övrigt gäller vad som stadgas i 7 eller 8 kap jordabalken om lägenhetsarrende.',
          conditionText: '',
        },
        {
          key: 'jordabalkenTerms.condition.replaces',

          header:
            'Detta avtal ersätter fr.o.m. 20XX-XX-XX det mellan parterna tidigare träffade avtalet daterat 1988-01-01 samt tillägg daterat 19XX-XX-XX.',
          conditionText: '',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="soilbeam-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="soilbeam-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="soilbeam-table"] .sk-table-tbody-tr').should('have.length', soilBeam.length);
      soilBeam.forEach((s) => {
        cy.get('[data-cy="soilbeam-table"] .sk-table-tbody-tr .sk-form-checkbox-label')
          .contains(s.header)
          .should('exist');
        cy.get('[data-cy="soilbeam-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="soilbeam-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="soilbeam-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="soilbeam-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    // Signatures
    it('manages signatures', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="signature-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="signature-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="signature-table-option"]').should('exist').click();

      cy.get('[data-cy="signature-table"] .sk-table-tbody-tr').should(
        'have.length',
        mockMexErrand_base.data.stakeholders.length
      );
      mockMexErrand_base.data.stakeholders.forEach((s) => {
        cy.get('[data-cy="signature-table"] .sk-table-tbody-tr')
          .should('exist')
          .contains(s.firstName + ' ' + s.lastName)
          .get('[data-cy="signature-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-dialog .sk-form-input').should('exist').type('1');
      cy.get('button').should('exist').contains('Importera').click();

      cy.get('[data-cy="signature-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');
      cy.get('[data-cy="signature-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="signature-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });
  });
});
