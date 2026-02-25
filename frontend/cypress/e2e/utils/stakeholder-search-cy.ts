import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';

export const supportManagementPersonSearch = () => {
  cy.get('[data-cy="search-person-form-PRIMARY"').click();
  cy.get('[data-cy="contact-personNumber-owner"]').type('WORD!');
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"')
    .should('exist')
    .should('contain.text', 'Ej giltigt personnummer (ange tolv siffror: ååååmmddxxxx)');
  cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"').should('not.exist');
};

export const supportManagementEmployeeSearch = () => {
  cy.get('[data-cy="search-employee-form-PRIMARY"').click();
  cy.get('[data-cy="contact-personNumber-owner"]').clear().type('mockusername');
  cy.get('[data-cy="contact-personNumber-owner"]').parent().find('button').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"').should('not.exist');
};

export const supportManagementEnterpriseSearch = () => {
  cy.get('[data-cy="search-enterprise-form-PRIMARY"]').click();
  cy.get('[data-cy="contact-orgNumber-owner"]').type('WORD!');
  cy.get('[data-cy="org-number-error-message"]')
    .should('exist')
    .should('contain.text', 'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)');
  cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber').replace('-', ''));
  cy.get('[data-cy="org-number-error-message"]')
    .should('exist')
    .should('contain.text', 'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)');
  cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber'));
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="org-number-error-message"]').should('not.exist');
};

export const supportManagementOrganizationSearch = () => {
  cy.get('[data-cy="search-organization-form-PRIMARY"]').click();
  cy.get('[data-cy="contact-orgNumber-owner"]').clear().type('WORD!');
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="org-number-error-message"]')
    .should('exist')
    .should('contain.text', 'Ej giltigt organisationsnummer (ange tio siffror med streck: kkllmm-nnnn)');
  cy.get('[data-cy="contact-orgNumber-owner"]').clear().type(Cypress.env('mockOrganizationNumber'));
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="org-number-error-message"]').should('not.exist');
};

export const displayManuallyAddStakeholderModal = () => {
  cy.get('[data-cy="add-manually-button-owner"]').should('exist');
  cy.get('[data-cy="add-manually-button-owner"]').should('be.enabled');
  cy.get('[data-cy="add-manually-button-owner"]').click();

  cy.get('[data-cy="contact-externalIdType-owner"]').should('exist');
  cy.get('[data-cy="contact-externalIdType-owner"]').should('have.value', 'PRIVATE');
  cy.get('[data-cy="contact-role-owner"]').should('exist');
  cy.get('[data-cy="contact-role-owner"]').should('have.value', 'PRIMARY');
  cy.get('[data-cy="contact-externalId-owner"]').should('exist');
  cy.get('[data-cy="contact-personNumber"]').should('exist');
  cy.get('[data-cy="contact-firstName"]').should('exist');
  cy.get('[data-cy="contact-lastName"]').should('exist');
  cy.get('[data-cy="contact-address"]').should('exist');
  cy.get('[data-cy="contact-careOf"]').should('exist');
  cy.get('[data-cy="contact-zipCode"]').should('exist');
  cy.get('[data-cy="contact-city"]').should('exist');
};

export const disabledIncompleteContactForm = () => {
  cy.get('[data-cy="add-manually-button-owner"]').should('exist');
  cy.get('[data-cy="add-manually-button-owner"]').should('be.enabled');
  cy.get('[data-cy="add-manually-button-owner"]').click();

  cy.get('[data-cy="submit-contact-button"]').should('be.disabled');
};

export const searchAndSavePersonStakeholder = (mockAdressResponse: any) => {
  cy.get('[data-cy="search-person-form-PRIMARY"').click();
  cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"]').should('not.exist');

  //TODO: Something makes the form dirty in the application
  // Save button
  //cy.get('[data-cy="save-button"]').should('be.disabled');

  cy.get('[data-cy="contact-form"] button').contains('Sök').click();
  cy.get('[data-cy="search-result"]').should('exist');
  cy.get('[data-cy="search-result"]').contains('Kim Svensson').should('exist');
  cy.get('[data-cy="search-result"]').contains(Cypress.env('mockPersonNumber')).should('exist');
  cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].address).should('exist');
  cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
  cy.get('[data-cy="search-result"]').contains(mockAdressResponse.data.addresses[0].city).should('exist');

  // Submit it
  cy.get('[data-cy="submit-contact-person-button').click();

  cy.get('[data-cy="stakeholder-name"]').contains('Kim Svensson').should('exist');
  cy.get('[data-cy="stakeholder-ssn"]').contains(Cypress.env('mockPersonNumber')).should('exist');
  cy.get('[data-cy="stakeholder-adress"]').contains(mockAdressResponse.data.addresses[0].address).should('exist');
  cy.get('[data-cy="stakeholder-adress"]').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
  cy.get('[data-cy="stakeholder-adress"]').contains(mockAdressResponse.data.addresses[0].city).should('exist');

  // Save button
  cy.get('[data-cy="save-button"]').should('be.enabled');
  cy.get('[data-cy="save-button"]').click();
  cy.get('[data-cy="save-button"]').should('be.disabled');

  cy.get('[data-cy="stakeholder-name"]').contains(mockAdressResponse.data.givenname);
  cy.get('[data-cy="stakeholder-name"]').contains(mockAdressResponse.data.lastname);

  cy.wait('@patchErrandContacts').should(({ request, response }) => {
    expect(request.body.stakeholders.length).to.equal(1);
    const s: SupportStakeholderFormModel = request.body.stakeholders[0];
    expect(s.firstName).to.equal(mockAdressResponse.data.givenname);
    expect(s.organizationName).to.equal('');
    expect(s.lastName).to.equal(mockAdressResponse.data.lastname);
    expect(s.externalIdType).to.equal('PRIVATE');
    expect(s.role).to.equal('PRIMARY');
    expect([200, 304]).to.include(response && response.statusCode);
  });
};

export const clearSearchResultOnPersonNumberChange = (mockAdressResponse: any) => {
  cy.get('[data-cy="search-person-form-PRIMARY"').click();
  cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"').should('not.exist');
  cy.get('[data-cy="contact-form"] button').contains('Sök').click();
  cy.get('[data-cy="search-result"').should('exist');
  cy.get('[data-cy="search-result"').contains('Kim Svensson').should('exist');
  cy.get('[data-cy="search-result"').contains(Cypress.env('mockPersonNumber')).should('exist');
  cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].address).should('exist');
  cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].postalCode).should('exist');
  cy.get('[data-cy="search-result"').contains(mockAdressResponse.data.addresses[0].city).should('exist');

  // Change personnumber
  cy.get('[data-cy="contact-personNumber-owner"]').type('1');
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"').should('exist');

  // Open manual form, it should be empty
  cy.get('[data-cy="add-manually-button-owner"]').click();
  cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
  cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
  cy.get('[data-cy="contact-firstName"]').should('have.value', '');
  cy.get('[data-cy="contact-lastName"]').should('have.value', '');
  cy.get('[data-cy="contact-address"]').should('have.value', '');
  cy.get('[data-cy="contact-careOf"]').should('have.value', '');
  cy.get('[data-cy="contact-zipCode"]').should('have.value', '');
};

export const sendCorrectDataOnManualAddPerson = () => {
  cy.get('[data-cy="contact-personNumber"]').should('have.attr', 'readonly');
  cy.get('[data-cy="contact-personNumber"]').should('have.value', '');
  cy.get('[data-cy="contact-firstName"]').type('Test');
  cy.get('[data-cy="contact-lastName"]').type('Testsson');
  cy.get('[data-cy="contact-address"]').type('Testaddress');
  cy.get('[data-cy="contact-careOf"]').type('TestcareOf');
  cy.get('[data-cy="contact-zipCode"]').type('12345');
  cy.get('[data-cy="contact-city"]').type('Teststaden');

  cy.get('[data-cy="submit-contact-button"]').click();
  cy.get('[data-cy="save-button"]').click();
  cy.wait('@patchErrandContacts').should(({ request, response }) => {
    expect(request.body.stakeholders.length).to.equal(1);
    const s: SupportStakeholderFormModel = request.body.stakeholders[0];
    expect(s.firstName).to.equal('Test');
    expect(s.lastName).to.equal('Testsson');
    expect(s.address).to.equal('Testaddress');
    expect(s.careOf).to.equal('TestcareOf');
    expect(s.zipCode).to.equal('12345');
    expect(s.city).to.equal('Teststaden');
    expect(s.externalIdType).to.equal('PRIVATE');
    expect(s.role).to.equal('PRIMARY');
    expect([200, 304]).to.include(response && response.statusCode);
  });

  cy.get('[data-cy="stakeholder-name"]').contains('Test');
  cy.get('[data-cy="stakeholder-name"]').contains('Testsson');
  cy.get('[data-cy="stakeholder-adress"]').contains('Testaddress');
  cy.get('[data-cy="stakeholder-adress"]').contains('12345');
  cy.get('[data-cy="stakeholder-adress"]').contains('Teststaden');
};

export const searchAndSaveContactPersonStakeholder = (mockAdressResponse: any, mockPersonIdResponse: any) => {
  cy.get('[data-cy="search-person-form-PRIMARY"').click();
  cy.get('[data-cy="contact-personNumber-owner"]').clear().type(Cypress.env('mockPersonNumber'));
  cy.get('[data-cy="contact-form"] button').contains('Sök').should('be.enabled');
  cy.get('[data-cy="personal-number-error-message"]').should('not.exist');
  cy.get('[data-cy="contact-form"] button').contains('Sök').click();
  cy.get('[data-cy="contact-externalId-owner"]').should('have.value', mockPersonIdResponse.data.personId);
  cy.wait('@getAddress');
  cy.get('[data-cy="stakeholder-name"]').should(
    'have.text',
    mockAdressResponse.data.givenname + ' ' + mockAdressResponse.data.lastname
  );
  cy.get('[data-cy="stakeholder-adress"]').should(
    'have.text',
    mockAdressResponse.data.addresses[0].address +
      ' ' +
      mockAdressResponse.data.addresses[0].postalCode +
      ' ' +
      mockAdressResponse.data.addresses[0].city
  );
  cy.get('[data-cy="stakeholder-phone"]').should('exist');
  cy.get('[data-cy="new-email-input"]').should('exist').first().type(Cypress.env('mockEmail'));
  cy.get('[data-cy="add-new-email-button"]').should('exist').contains('Lägg till').click();
  cy.get('[data-cy="newPhoneNumber"]').should('exist').type(Cypress.env('mockPhoneNumberCountryCode'));
  cy.get('[data-cy="newPhoneNumber-button"]').should('exist').contains('Lägg till').click();
  cy.get('[data-cy="submit-contact-person-button"]').should('exist').contains('Lägg till ärendeägare').click();
  cy.get('[data-cy="save-button"]').click();
  const m = mockAdressResponse.data;
  cy.wait('@patchErrandContacts').should(({ request, response }) => {
    expect(request.body.stakeholders.length).to.equal(1);
    const m = mockAdressResponse.data;
    const s: SupportStakeholderFormModel = request.body.stakeholders[0];
    expect(s.firstName).to.equal(m.givenname);
    expect(s.lastName).to.equal(m.lastname);
    expect(s.role).to.equal('PRIMARY');
    expect(s.externalIdType).to.equal('PRIVATE');
    expect(s.contactChannels && s.contactChannels.length > 0, 'Expected contactChannels to have entries').to.be.true;
    expect(s.contactChannels![0].value).to.equal(Cypress.env('mockEmail'));
    expect(s.contactChannels![1].value).to.equal(Cypress.env('mockPhoneNumberCountryCode'));
    expect([200, 304]).to.include(response && response.statusCode);
  });

  cy.get('[data-cy="stakeholder-name"]').contains(m.givenname);
  cy.get('[data-cy="stakeholder-name"]').contains(m.lastname);
  cy.get('[data-cy="stakeholder-email"]').contains(Cypress.env('mockEmail'));
  cy.get('[data-cy="stakeholder-phone"]').contains(Cypress.env('mockPhoneNumberCountryCode'));
};
