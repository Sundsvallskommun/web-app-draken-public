export const mockLegalEntityResponse = {
  data: {
    legalEntityId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    organizationNumber: '000000-0000',
    name: 'Sundsvall Påhittade Aktiebolag',
    legalForm: {
      legalFormId: '00',
      name: 'Övriga aktiebolag',
    },
    postAddress: {
      coAdress: 'c/o Test',
      country: null,
      postalCode: '12345',
      city: 'TEST 4',
      address1: null,
      address2: null,
    },
    address: {
      addressArea: 'Test Street',
      adressNumber: null,
      city: 'TEST 4',
      postalCode: '12345',
      municipality: 'Sundsvall',
      county: 'Västernorrland',
    },
    eMail: null,
    phoneNumber: '0701740635',
    countyMunicipalityCode: '2281',
    municipality: 'Sundsvall kommun',
    county: 'Västernorrlands län',
    partyId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  },
  message: 'success',
};
