export const mockOrganization = {
  data: {
    name: 'Test company AB',
    legalForm: {
      legalFormDescription: 'Övriga aktiebolag',
      legalFormCode: '49',
    },
    address: {
      city: 'TEST 4',
      addressArea: 'Test Street',
      postalCode: '12345',
    },
    phoneNumber: '00000000',
    municipality: {
      municipalityName: 'Stockholm kommun',
      municipalityCode: '0180',
    },
    county: {
      countyName: 'Stockholms län',
      countyCode: '01',
    },
    fiscalYear: {
      fromDay: 1,
      fromMonth: 1,
      toDay: 31,
      toMonth: 12,
    },
    companyForm: {
      companyFormCode: 'AB',
      companyFormDescription: 'aktiebolag',
    },
    companyRegistrationTime: '2004-02-27',
    companyLocation: {
      address: {
        city: 'TESTSTADEN',
        street: 'TESTGATA 2',
        postcode: '01234',
      },
    },
    businessSignatory: 'Firman tecknas av styrelsen Firman tecknas var för sig av ledamöterna suppleanten',
    companyDescription: 'Bolaget skall bedriva testverksamhet',
    sharesInformation: {
      shareTypes: [],
      numberOfShares: 1000,
      shareCapital: 100000,
      shareCurrency: 'sek',
    },
  },
  message: 'success',
};
