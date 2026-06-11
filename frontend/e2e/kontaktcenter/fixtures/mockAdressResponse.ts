export const mockAdressResponse = {
  data: {
    personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
    givenname: 'Kim',
    lastname: 'Svensson',
    nrDate: '20230101',
    addresses: [
      {
        realEstateDescription: 'BALDER 1',
        address: 'NORRMALMSGATAN 4',
        apartmentNumber: 'LGH 1001',
        postalCode: '851 85',
        city: 'SUNDSVALL',
        municipality: '2281',
        country: 'SVERIGE',
        emigrated: false,
        addressType: 'POPULATION_REGISTRATION_ADDRESS',
      },
    ],
  },
  message: 'success',
};

export const mockPersonIdResponse = {
  data: { personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc' },
  message: 'success',
};
