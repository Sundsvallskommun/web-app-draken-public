/// <reference types="cypress" />

import { onlyOn } from '@cypress/skip-test';
import { mockAttachments } from 'cypress/e2e/case-data/fixtures/mockAttachments';
import { mockHistory } from 'cypress/e2e/case-data/fixtures/mockHistory';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPersonId } from 'cypress/e2e/case-data/fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockAsset } from '../fixtures/mockAsset';
import { mockContract } from '../fixtures/mockContract';
import { mockConversations, mockConversationMessages } from '../fixtures/mockConversations';
import { mockRelations } from '../fixtures/mockRelations';

onlyOn(Cypress.env('application_name') === 'MEX', () => {
  describe('Errand page support attachments tab', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/messages/MEX-2024-000280*', mockMessages);
      cy.intercept('GET', '**/users/admins', mockAdmins);
      cy.intercept('GET', '**/me', mockMe);
      cy.intercept('POST', '**/personid', mockPersonId);
      cy.intercept('POST', '**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders);
      cy.intercept('GET', /\/errand\/\d*/, mockMexErrand_base).as('getErrandById');
      cy.intercept('GET', /\/errand\/\d+\/attachments$/, mockAttachments).as('getErrandAttachments');
      cy.intercept('GET', '**/contract/2024-01026', {
        data: {
          contractId: '2024-01026',
          type: 'PURCHASE_AGREEMENT',
          stakeholders: mockMexErrand_base.data.stakeholders,
          indexTerms: [],
        },
      }).as('getContract');
      cy.intercept('PUT', '**/contract/2024-01026', contractText).as('putContract');
      cy.intercept('POST', '**/contract', contractText).as('postPurchaseContract');
      cy.intercept('PATCH', '**/errands/*', { data: 'ok', message: 'ok' }).as('patchErrand');
      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/errands/*/history', mockHistory).as('getHistory');
      cy.intercept('GET', /\/errand\/\d+\/messages$/, mockMessages);

      cy.intercept('GET', '**/contract/2024-01026', mockContract).as('getContract');

      cy.intercept('GET', '**/errand/errandNumber/*', mockMexErrand_base).as('getErrand');
      cy.intercept('GET', '**/sourcerelations/**/**', mockRelations).as('getSourceRelations');
      cy.intercept('GET', '**/targetrelations/**/**', mockRelations).as('getTargetRelations');
      cy.intercept('GET', '**/namespace/errands/**/communication/conversations', mockConversations).as(
        'getConversations'
      );
      cy.intercept('GET', '**/errands/**/communication/conversations/*/messages', mockConversationMessages).as(
        'getConversationMessages'
      );
      cy.intercept('GET', '**/assets**', mockAsset).as('getAssets');

      cy.visit(`/arende/${mockMexErrand_base.data.municipalityId}/${mockMexErrand_base.data.id}`);
      cy.wait('@getErrand');
      cy.wait('@getContract');
      cy.get('.sk-cookie-consent-btn-wrapper').contains('Godkänn alla').click();
      cy.get('.sk-tabs-list button').eq(4).should('have.text', `Avtal`).click({ force: true });
    });
    const contractText = {
      data: {
        contractId: '2024-01026',
        externalReferenceId: '123123',
        contractType: 'PURCHASE_AGREEMENT',
        status: 'ACTIVE',
        propertyDesignations: ['SUNDSVALL BLA'],
      },
    };

    it('shows the correct contracts information', () => {
      const purchaseType = [
        { key: 'parties', label: 'Parter' },
        { key: 'overlatelse', label: 'Överlåtelseförklaring' },
        { key: 'payment', label: 'Köpeskilling och betalning' },
        { key: 'access', label: 'Tillträde' },
        { key: 'pollution', label: 'Markföroreningar' },
        { key: 'forest', label: 'Skog' },
        { key: 'seller-obligations', label: 'Säljarens förpliktelser' },
        { key: 'expenses', label: 'Utgifter och kostnader' },
        { key: 'property', label: 'Fastighetsbildning' },
        { key: 'other', label: 'Övriga villkor' },
      ];
      cy.get('[data-cy="purchaseType"]').should('exist').check();

      //Purchase contracts
      purchaseType.forEach((type) => {
        cy.get(`[data-cy="badge-${type.key}"]`).contains(type.label).should('exist');
      });
      cy.get('[data-cy="parties-disclosure"]').contains('Parter').should('exist');
      cy.get('[data-cy="transfer-disclosure"]').contains('Överlåtelseförklaring').should('exist');
      cy.get('[data-cy="purchase-price-disclosure"]').contains('Köpeskilling och betalning').should('exist');
      cy.get('[data-cy="access-disclosure"]').contains('Tillträde').should('exist');
      cy.get('[data-cy="soil-pollution-disclosure"]').contains('Markföroreningar').should('exist');
      cy.get('[data-cy="forest-disclosure"]').contains('Skog').should('exist');
      cy.get('[data-cy="sellers-obligation-disclosure"]').contains('Säljarens förpliktelser').should('exist');
      cy.get('[data-cy="expenses-costs-disclosure"]').contains('Utgifter och kostnader').should('exist');
      cy.get('[data-cy="property-formation-disclosure"]').contains('Fastighetsbildning').should('exist');
      cy.get('[data-cy="other-conditions-disclosure"]').contains('Övriga villkor').should('exist');
    });

    //PARTIES
    it('manages parties in land lease contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="parties-disclosure"]').should('exist');
      cy.get('[data-cy="seller-table"] .sk-table-tbody-tr')
        .should('exist')
        .contains(
          `${mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('SELLER'))?.firstName} ${
            mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('SELLER'))?.lastName
          }`
        );
      cy.get('[data-cy="seller-table"] .sk-table-tbody-tr input[type="text"]').should('exist').type('Andel 123');

      cy.get('[data-cy="buyer-table"] .sk-table-tbody-tr')
        .should('exist')
        .contains(
          `${mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('BUYER'))?.firstName} ${
            mockMexErrand_base.data.stakeholders.find((x) => x.roles.includes('BUYER'))?.lastName
          }`
        );
      cy.get('[data-cy="buyer-table"] .sk-table-tbody-tr input[type="text"]').should('exist').type('Andel 123');

      cy.get('[data-cy="parties-disclosure"] .sk-disclosure-body button.sk-btn-tertiary')
        .should('exist')
        .contains('Läs in från ärende')
        .click();
      cy.wait('@getErrand');
      cy.get('[data-cy="parties-disclosure"] button.sk-btn-tertiary[aria-expanded="true"]').should('exist').click();
    });

    it('manages disclosure inputs manually in purchase contracts', () => {
      const dataCys = [
        'transfer',
        'purchase-price',
        'access',
        'soil-pollution',
        'forest',
        'sellers-obligation',
        'expenses-costs',
        'property-formation',
        'other-conditions',
      ];

      dataCys.forEach((datacy) => {
        const inputText = 'Skriver ett villkor';
        cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-tertiary`).should('exist').click();
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-primary`).contains('Fyll i villkor').should('exist');

        cy.get(`[data-cy="${datacy}-richtext-wrapper"] .ql-editor[contenteditable="false"]`).should('exist');
        cy.get(`[data-cy="manual-text-checkbox-${datacy}"]`).should('exist').check({ force: true });
        cy.get(`[data-cy="${datacy}-richtext-wrapper"] .ql-editor[contenteditable="true"]`)
          .should('exist')
          .type(inputText);
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-primary`).contains('Spara').should('exist').click();
        cy.wait('@getErrand');
        cy.get(`[data-cy="${datacy}-disclosure"] button.sk-btn-tertiary`).should('exist').click();
      });
    });

    //TRANSFERS
    it('manages transfer automatically in purchase contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="transfer-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="transfer-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');
      cy.get('[data-cy="table-propertyDesignations-top"] .sk-table-col-content').contains(
        mockMexErrand_base.data.facilities[0].address.propertyDesignation.replace('SUNDSVALL ', '')
      );

      cy.get('[data-cy="yes-includeBuilding"]').should('exist').check();
      cy.get('[data-cy="no-includeBuilding"]').should('exist').check();

      cy.get('#mapAttachments').should('exist').type('attachment.txt');
      cy.get('#mapAttachmentReference').should('exist').type('mapattachment.txt');

      cy.get('[data-cy="yes-includeBuildingsInArea"]').should('exist').check();
      cy.get('[data-cy="no-includeBuildingsInArea"]').should('exist').check();
      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="transfer-richtext-wrapper"] .ql-editor[contenteditable="false"]')
        .should('exist')
        .contains(mockMexErrand_base.data.facilities[0].address.propertyDesignation.replace('SUNDSVALL ', ''));

      cy.get('[data-cy="transfer-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="transfer-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //PURCHASE PRICE
    it('manages purchase price automatically in purchase contracts', () => {
      const conditions = [
        {
          key: 'kopeskillingTerms.paymentCondition1',
          value: 'onDate',
          header: 'Betalning på angivet datum',
          conditionText: '',
        },
        {
          key: 'kopeskillingTerms.paymentCondition2',
          value: 'thirtyDays',
          header: 'Betalning inom 30 dagar efter beslut',
          conditionText:
            'Köpeskillingen ska erläggas senast 30 dagar efter det att kommunens beslut om detta förvärv vunnit laga kraft. På betalningsdagen upprättar säljaren köpebrev som växlas mellan parterna',
        },
        {
          key: 'kopeskillingTerms.paymentCondition3',
          value: 'fourWeeks',
          header: 'Betalning inom fyra veckor efter undertecknat avtal',
          conditionText:
            'Köpeskillingen ska erläggas senast fyra veckor efter det att parterna undertecknat detta avtal.',
        },
        {
          key: 'kopeskillingTerms.paymentCondition4',
          value: 'other',
          header: 'Köpebrev ska upprättas med kvittens på köpeskillingen',
          conditionText: '',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="purchase-price-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="purchase-price-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="kopeskilling-amountNumber"]').should('exist').clear().type('3600 kr');
      cy.get('[data-cy="kopeskilling-amountText"]').should('exist').clear().type('TRETUSEN SEXHUNDRA KRONOR');

      cy.get('[data-cy="table-kopeskillingTerms"] .sk-table-tbody-tr').should('have.length', conditions.length);

      conditions.forEach((c) => {
        if (cy.get('[data-cy="table-kopeskillingTerms"] .sk-table-tbody-tr').contains(c.header).should('exist')) {
          cy.get('[data-cy="table-kopeskillingTerms"] .sk-table-tbody-tr [type="radio"]').should('exist').check();
        }
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="purchase-price-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="purchase-price-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="purchase-price-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //ACCESS
    it('manages access automatically in purchase contracts', () => {
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="access-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="access-disclosure"] button.sk-btn-primary').contains('Fyll i villkor').should('exist').click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="timeOfAccess-radioGroup"] [type="radio"]').eq(0).should('exist').check();
      cy.get('[data-cy="timeOfAccess-radioGroup"] [type="radio"]').eq(1).should('exist').check();
      cy.get('#accessDate[aria-disabled="true"]').should('be.disabled');

      cy.get('[data-cy="timeOfAccess-radioGroup"] [type="radio"]').eq(0).should('exist').check();
      cy.get('#accessDate[aria-disabled="false"]').should('not.be.disabled').type(new Date().toLocaleDateString());
      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="access-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="access-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="access-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //SOIL POLLUTION
    it('manages soil pollution automatically in purchase contracts', () => {
      const pollutionConditions = [
        {
          key: 'markfororeningarTerms.condition.pollutionGuaranteeBuildable',
          header: 'Garanti för bebyggbarhet vid markföroreningar',
          conditionText:
            'Säljaren garanterar att området är lämpligt att bebygga enligt föroreningar i angiven detaljplan med avseende på markföroreningar. I det fallet att markföroreningar upptäcks efter köpet, som medför att marken inte längre är lämplig att bebygga enligt angiven detaljplan åligger det säljaren att bekosta avhjälpandet av dessa, så att marken återigenär lämplig att bebygga enligt angiven detaljplan. Detta åtagande är giltigt under fem år från tillträdesdagen.',
        },
        {
          key: 'markfororeningarTerms.condition.pollutionGuaranteeExtended',
          header: 'Utvidgad garanti vid upptäckta markföroreningar',
          conditionText:
            'Säljaren garanterar att fastigheten/området är lämpligt att bebygga enligt angiven detaljplan, med avseende på markföroreningar. I det fallet att ytterligare (inom sanerat område) markföroreningar upptäcks efter köpet, som medför att marken inte längre är lämplig att bebygga enligt angiven detaljplan, åligger det säljaren att bekosta avhjälpandet av dessa, så att marken återigen är lämplig att bebygga enligt angiven detaljplan. Detta åtagande är giltigt under fem år från tillträdesdagen.',
        },
        {
          key: 'markfororeningarTerms.condition.pollutionGuaranteeInspected',
          header: 'Överlåtelse i befintligt skick med undersökningsplikt',
          conditionText:
            'Fastigheten/området överlåts i befintligt skick. Köparen har beretts tillfälle att fullgöra sin undersökningsplikt enligt 10 kap. miljöbalken och 4 kap. jordabalken. Köparen är medveten om att fastigheten/området kan vara förorenat och att detta kan leda till kostnader för köparen vid en eventuell efterbehandling av fastigheten/området. Köparen godtar fastighetens/områdets skick och avstår med bindande verkan från alla anspråk gentemot säljaren på grund av markföroreningar eller fel och brister i övrigt i fastigheten/området.',
        },
      ];
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');
      cy.get('input#detailPlan').should('exist').type('Detail plan');
      cy.get('input#propertyOrArea').should('exist').type('Property or area');
      cy.get('[data-cy="pollution-conditions-table"] .sk-table-tbody-tr').should(
        'have.length',
        pollutionConditions.length
      );
      pollutionConditions.forEach((p) => {
        cy.get('[data-cy="pollution-conditions-table"] .sk-table-tbody-tr').contains(p.header).should('exist');
        cy.get('[data-cy="pollution-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="soil-pollution-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="soil-pollution-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //FOREST
    it('manages forest automatically in purchase contracts', () => {
      const forestConditions = [
        {
          key: 'skogTerms.condition.noClaims',
          header: 'Inga anspråk vid eventuella skogsavvikelser',
          conditionText:
            'Köparen avsäger sig från alla anspråk mot säljaren för eventuella skogsavvikelser gentemot verkliga förhållanden som kan finnas i de skogliga uppgifter säljaren redovisat för köparen',
        },
        {
          key: 'skogTerms.condition.huntingRights',
          header: 'Jakträtt gäller till angivet datum',
          conditionText:
            'Köparen godtar att den jakträttsupplåtelse som säljaren träffat och som löper tom 20XX-XX-XX, ska få gälla till detta datum',
        },
        {
          key: 'skogTerms.condition.noLogging',
          header: 'Garanti mot avverkningar efter skogsvärdering',
          conditionText:
            'Fastigheten överlåts i befintligt skick med därå växande skog. Säljaren garanterar att det, efter det att fastigheten skogsvärderats 20XX-XX-XX, inte har utförts avverkningar på fastigheten.',
        },
        {
          key: 'skogTerms.condition.noUnsoldLoggingRights',
          header: 'Garanti mot försålda och oavverkade avverkningsrätter',
          conditionText:
            'Säljaren garanterar att det inte finns träffade avtal om försålda och oavverkade avverkningsrätter inom den överlåtna fastigheten.',
        },
        {
          key: 'skogTerms.condition.takeOverAllAgreements',
          header: 'Köparen tar över alla avtal och rättigheter',
          conditionText:
            'Fastigheten överlåts i befintligt skick med därå växande skog. Säljaren garanterar att det, efter det att fastigheten skogsvärderats 20XX-XX-XX, inte har utförts avverkningar på fastigheten.',
        },
      ];
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="forest-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="forest-disclosure"] button.sk-btn-primary').contains('Fyll i villkor').should('exist').click();
      cy.get('.sk-modal-dialog').should('exist');
      cy.get('[data-cy="forest-conditions-table"] .sk-table-tbody-tr').should('have.length', forestConditions.length);
      forestConditions.forEach((f) => {
        cy.get('[data-cy="forest-conditions-table"] .sk-table-tbody-tr').contains(f.header).should('exist');
        cy.get('[data-cy="forest-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="forest-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="forest-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="forest-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //SELLERS OBLIGATION
    it('manages sellers obligation automatically in purchase contracts', () => {
      const sellerConditions = [
        {
          key: 'forpliktelserTerms.condition.insurance',
          header: 'Säljaren förbinder sig att hålla fastigheten försäkrad till och med tillträdesdagen.',
          conditionText: '',
        },
      ];
      const cleaningConditions = [
        {
          key: 'forpliktelserTerms.condition.cleaning',
          header: 'På tillträdelsedagen ska säljaren tillse att fastigheten/området är urplockat och utrymt.',
          conditionText: '',
        },
      ];
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="sellers-obligation-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="sellers-obligation-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      //sellers table
      cy.get('[data-cy="sellers-conditions-table"] .sk-table-tbody-tr').should('have.length', sellerConditions.length);
      sellerConditions.forEach((f) => {
        cy.get('[data-cy="sellers-conditions-table"] .sk-table-tbody-tr').contains(f.header).should('exist');
        cy.get('[data-cy="sellers-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });
      //cleaning table
      cy.get('[data-cy="cleaning-conditions-table"] .sk-table-tbody-tr').should(
        'have.length',
        cleaningConditions.length
      );
      cleaningConditions.forEach((f) => {
        cy.get('[data-cy="cleaning-conditions-table"] .sk-table-tbody-tr').contains(f.header).should('exist');
        cy.get('[data-cy="cleaning-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="sellers-obligation-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="sellers-obligation-disclosure"] button.sk-btn-primary')
        .contains('Spara')
        .should('exist')
        .click();
      cy.wait('@getErrand');

      cy.get('[data-cy="sellers-obligation-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //EXPENSES AND COSTS
    it('manages expenses and costs automatically in purchase contracts', () => {
      const expensesCostsConditions = [
        {
          key: 'utgifterTerms.condition.fees',
          header: 'Köparen ska ersätta säljarens personliga kringkostnader',
          conditionText:
            'Köparen ska ersätta säljaren med [summa] kr som personlig ersättning enligt expropriationslagens regler. XX XXX kr annan ersättning för flyttkostnader, förtida lösen av lån med mera. Utbetalningarna sker samtidigt med köpeskillingen',
        },
        {
          key: 'utgifterTerms.condition.taxes',
          header: 'Säljaren betalar skatter och avgifter fram till tillträde',
          conditionText:
            'Säljaren betalar alla skatter, avgifter och andra utgifter för fastigheten/området för tiden före tillträdesdagen även om de förfaller till betalning senare. Vad avser kommunal fastighetsavgift är parterna införstådda med att betalningsskyldigheten åvilar den av dem som är ägare av fastigheten den 1 januari respektive år.',
        },
        {
          key: 'utgifterTerms.condition.regulation',
          header: 'Köparen betalar för kostnader vid fastighetsreglering',
          conditionText:
            'Detta avtal får läggas till grund för ansökan om fastighetsreglering. Köparen betalar Lantmäteriets förrättningskostnader. Genomförs fastighetsbildningen ska förvärvet inte lagfaras.',
        },
        {
          key: 'utgifterTerms.condition.lagfart',
          header: 'Köparen betalar för lagfart och pantbrev efter utfärdat köpebrev',
          conditionText:
            'Lagfart får inte sökas på denna handling utan först sedan köpebrev utfärdats. Samtliga kostnader för lagfart och pantbrev betalas av köparen.',
        },
      ];
      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="expenses-costs-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="expenses-costs-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="expenses-costs-conditions-table"] .sk-table-tbody-tr').should(
        'have.length',
        expensesCostsConditions.length
      );
      expensesCostsConditions.forEach((f) => {
        cy.get('[data-cy="expenses-costs-conditions-table"] .sk-table-tbody-tr').contains(f.header).should('exist');
        cy.get('[data-cy="expenses-costs-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="expenses-costs-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="expenses-costs-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="expenses-costs-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //PROPERTY FORMATION
    it('manages property formation automatically in purchase contracts', () => {
      const expensesCostsConditions = [
        {
          key: 'fastighetsbildningTerms.condition.kringkostnader',
          header: 'Köparen ersätter säljarens kringkostnader vid köp',
          conditionText:
            'Detta avtal ska ligga till grund för beslut om fastighetsreglering vilket bekostas av köparen, säljaren ansöker om fastighetsbildning.',
        },
        {
          key: 'fastighetsbildningTerms.condition.taxes',
          header: 'Säljaren betalar skatter och avgifter fram till tillträde',
          conditionText:
            'Detta avtal får ligga till grund för beslut om fastighetsreglering vilket bekostas av köparen, säljaren ansöker om fastighetsbildning.',
        },
        {
          key: 'fastighetsbildningTerms.condition.regulation',
          header: 'Köparen betalar för kostnader vid fastighetsreglering',
          conditionText:
            'Detta avtal får ligga till grund för beslut om ledningsrätt för befintliga underjordiska ledningar inom fastigheten/området, tidigare val gäller även här, vilket bekostas av ledningsägaren',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="property-formation-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="property-formation-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="property-formation-conditions-table"] .sk-table-tbody-tr').should(
        'have.length',
        expensesCostsConditions.length
      );
      expensesCostsConditions.forEach((f) => {
        cy.get('[data-cy="property-formation-conditions-table"] .sk-table-tbody-tr').contains(f.header).should('exist');
        cy.get('[data-cy="property-formation-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="property-formation-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="property-formation-disclosure"] button.sk-btn-primary')
        .contains('Spara')
        .should('exist')
        .click();
      cy.wait('@getErrand');

      cy.get('[data-cy="property-formation-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });

    //OTHER CONDITIONS
    it('manages other conditions automatically in purchase contracts', () => {
      const otherConditions = [
        {
          key: 'otherTerms.condition.inspected',
          header: 'Köparen har godkänt skick och gränser genom besiktning',
          conditionText:
            'Köparen har besiktat fastigheten/området och godtar dess skick och gränser och avsäger sig med bindande verkan från alla anspråk mot säljaren för fel eller brister på fastigheten.',
        },
        {
          key: 'otherTerms.condition.asis',
          header: 'Fastigheten/Området överlåts i befintligt skick',
          conditionText:
            'Fastigheten/Området överlåts i befintligt skick, samt fri från penninginteckningar, oinskrivna nyttjanderätter och servitut.',
        },
        {
          key: 'otherTerms.condition.fees',
          header: 'Ansvarsfördelning för utgifter före och efter tillträde',
          conditionText:
            'Säljaren ansvarar för alla utgifter för tiden före tillträdesdagen och köparen för tiden därefter.',
        },
        {
          key: 'otherTerms.condition.keys',
          header: 'Säljaren ansvarar för uppsägning av abonnemang och överlämning av nycklar',
          conditionText:
            'Det åligger säljaren att säga upp gällande vatten-, el- och sophämtningsabonnemang för fastigheten. Nycklar tillhörande fastigheten ska överlämnas till köparen på tillträdesdagen.',
        },
        {
          key: 'otherTerms.condition.deedPaidByBuyer',
          header: 'Lagfartskostnaden ska betalas av köparen.',
          conditionText: '',
        },
      ];

      cy.intercept('GET', '**/errand/101', mockMexErrand_base).as('getErrand');
      cy.get('[data-cy="other-conditions-disclosure"] button.sk-btn-tertiary').should('exist').click();
      cy.get('[data-cy="other-conditions-disclosure"] button.sk-btn-primary')
        .contains('Fyll i villkor')
        .should('exist')
        .click();
      cy.get('.sk-modal-dialog').should('exist');

      cy.get('[data-cy="other-conditions-conditions-table"] .sk-table-tbody-tr').should(
        'have.length',
        otherConditions.length
      );
      otherConditions.forEach((f) => {
        cy.get('[data-cy="other-conditions-conditions-table"] .sk-table-tbody-tr').contains(f.header).should('exist');
        cy.get('[data-cy="other-conditions-conditions-table"] .sk-table-tbody-tr [type="checkbox"]')
          .should('exist')
          .check({ force: true });
      });

      cy.get('.sk-modal-content button.sk-btn-primary').contains('Importera').should('exist').click();

      cy.get('[data-cy="other-conditions-richtext-wrapper"] .ql-editor[contenteditable="false"]').should('exist');

      cy.get('[data-cy="other-conditions-disclosure"] button.sk-btn-primary').contains('Spara').should('exist').click();
      cy.wait('@getErrand');

      cy.get('[data-cy="other-conditions-disclosure"] button.sk-btn-tertiary').should('exist').click();
    });
  });
});
