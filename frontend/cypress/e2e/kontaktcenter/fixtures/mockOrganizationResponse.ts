export const mockOrganizationResponse = {
  data: {
    companyName: 'Hooli Sweden AB',
    legalForm: {
      legalFormDescription: 'Övriga aktiebolag',
      legalFormCode: '49',
    },
    address: {
      city: 'STOCKHOLM',
      street: 'GATA 2',
      postcode: '11111',
    },
    phoneNumber: Cypress.env('mockPhoneNumber'),
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
        city: 'STOCKHOLM',
        street: 'GATA 2',
        postcode: '11111',
      },
    },
    businessSignatory: 'Firman tecknas av styrelsen Firman tecknas var för sig av ledamoten suppleanten',
    companyDescription:
      'Bolaget skall bedriva utveckling och marknadsföring, tillhandahål- lande och försäljning av internetrelaterade produkter och /eller tjänster inom internetsökning, internetannonsering och andra prog- ram, produkter, tjänster och applikationer som är relaterade till internet och bedriva produktion och utveckling av datorbaserade teknologiprogram, produkter, tjänster och applikationer samt där- med förenlig verksamhet.',
    sharesInformation: {
      shareTypes: [],
      numberOfShares: 1000,
      shareCapital: 100000,
      shareCurrency: 'sek',
    },
  },
  message: 'success',
};
