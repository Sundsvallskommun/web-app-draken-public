// This person number is for test purposes, from the Swedish Tax Agency
export const MOCK_PERSON_NUMBER = Cypress.env('mockPersonNumber');
export const mockEstateInfo11 = {
  data: {
    designation: 'SUNDSVALL 1:1',
    district: 'Låtsasdistrikt',
    objectidentifier: '909a6a80-aaaa-aaaa-aaaa-ed8f66444c3f',
    totalArea: 1555,
    totalAreaWater: 0,
    totalAreaLand: 1555,
    ownerChanges: [
      {
        objectidentifier: '08f4f854-aaaa-aaaa-aaaa-b2b85fd859a6',
        acquisition: [
          {
            objectidentifier: '2d1ba85e-aaaa-aaaa-aaaa-6c85c42a68a8',
            enrollmentDay: '2005-07-08',
            fileNumber: '',
            decision: 'Beviljad',
            share: '1/1',
            acquisitionDay: '2005-06-02',
            acquisitionType: 'Köp',
            registeredOwnership: '5e67f5e2-aaaa-aaaa-aaaa-de17544eae45',
          },
        ],
        purchasePrice: {
          objectidentifier: '51c03820-aaaa-aaaa-aaaa-4228c9414932',
          purchasePriceImmovableProperty: {
            currency: 'SEK',
            sum: 120000,
          },
          purchasePriceType: 'Avser hela fastigheten',
        },
        transfer: [
          {
            objectidentifier: 'a1264c53-aaaa-aaaa-aaaa-4b11621c38b6',
            share: '1/1',
            registeredOwnership: 'f99d3951-aaaa-aaaa-aaaa-3bcd181be85d',
          },
        ],
      },
      {
        objectidentifier: 'c0f5b979-aaaa-aaaa-aaaa-b374810c266b',
        acquisition: [
          {
            objectidentifier: '96a045ea-aaaa-aaaa-aaaa-1a3596d89adf',
            enrollmentDay: '1988-09-28',
            fileNumber: '',
            decision: 'Beviljad',
            share: '1/1',
            acquisitionDay: '1988-01-05',
            acquisitionType: 'Köp',
            registeredOwnership: 'f99d3951-aaaa-aaaa-aaaa-3bcd181hed5d',
          },
        ],
        purchasePrice: {
          objectidentifier: 'c73e8667-aaaa-aaaa-aaaa-678d847d914a',
          purchasePriceImmovableProperty: {
            currency: 'SEK',
            sum: 30000,
          },
          purchasePriceType: 'Avser hela fastigheten',
        },
        transfer: [
          {
            objectidentifier: 'f3b63c19-aaaa-aaaa-aaaa-d94505320d5c',
            share: '1/1',
            registeredOwnership: '2613a16d-aaaa-aaaa-aaaa-db451e020a91',
          },
        ],
      },
      {
        objectidentifier: 'aeee76b4-aaaa-aaaa-aaaa-afb360b5fc1c',
        acquisition: [
          {
            objectidentifier: '94e44516-aaaa-aaaa-aaaa-561b04f7840c',
            fileNumber: '',
            decision: 'Beviljad',
            share: '1/1',
            acquisitionDay: '1960-11-28',
            acquisitionType: 'Köp',
            registeredOwnership: '2613a14d-aaaa-aaaa-aaaa-db461e020a91',
          },
        ],
        purchasePrice: {},
        transfer: [],
      },
      {
        objectidentifier: 'e5b62297-aaaa-aaaa-aaaa-6a6b13305aab',
        acquisition: [
          {
            objectidentifier: '19593c8d-aaaa-aaaa-aaaa-29f1c9f2a4aa',
            enrollmentDay: '2015-09-09',
            fileNumber: 'D-2015-0000000:1',
            decision: 'Beviljad',
            share: '1/1',
            acquisitionDay: '2015-09-01',
            acquisitionType: 'Köp',
            acquisitionCode: '11',
            registeredOwnership: 'f5b5a7ef-aaaa-aaaa-aaaa-fb4b1ca67bd6',
          },
        ],
        purchasePrice: {
          objectidentifier: 'd714a171-aaaa-aaaa-aaaa-e094b0e547d3',
          purchasePriceImmovableProperty: {
            currency: 'SEK',
            sum: 600000,
          },
          purchasePriceType: 'Avser hela fastigheten',
        },
        transfer: [
          {
            objectidentifier: '2976c029-aaaa-aaaa-aaaa-677f81d69ac5',
            share: '1/1',
            registeredOwnership: '5e6ff7e2-aaaa-aaaa-aaaa-de17544eae45',
          },
        ],
      },
      {
        objectidentifier: '777a7606-aaaa-aaaa-aaaa-8fe0d36a5e3d',
        acquisition: [
          {
            objectidentifier: '6eec0e7d-aaaa-aaaa-aaaa-4447593aea98',
            enrollmentDay: '2016-12-11',
            fileNumber: 'D-2016-0000000:1',
            decision: 'Beviljad',
            share: '1/1',
            acquisitionDay: '2016-12-15',
            acquisitionType: 'Köp',
            acquisitionCode: '11',
            registeredOwnership: 'bfe9cf52-aaaa-aaaa-aaaa-c86db1c30b07',
          },
        ],
        purchasePrice: {
          objectidentifier: 'f584c7a3-aaaa-aaaa-aaaa-41ffd3d20545',
          purchasePriceImmovableProperty: {
            currency: 'SEK',
            sum: 3500000,
          },
          purchasePriceType: 'Avser hela fastigheten',
        },
        transfer: [
          {
            objectidentifier: '4f397d97-aaaa-aaaa-aaaa-db1aaf74c8c3',
            share: '1/1',
            registeredOwnership: 'f5b5a7ef-aaaa-aaaa-aaaa-fb4b1ca67bd6',
          },
        ],
      },
    ],
    ownership: [
      {
        type: 'Lagfart',
        objectidentifier: 'bfe9cf52-aaaa-aaaa-aaaa-c86db1c30b07',
        enrollmentDay: '2016-12-11',
        decision: 'Beviljad',
        share: '1/1',
        versionValidFrom: '2017-01-02T13:30:54.097+01:00',
        owner: {
          idnumber: MOCK_PERSON_NUMBER,
          name: 'Test Testsson',
          coAddress: '',
          address: 'TESTVÄGEN 1',
          postalCode: '12345',
          city: 'SUNDSVALL',
        },
      },
    ],
    mortage: [
      {
        objectidentifier: 'b1c4527c-aaaa-aaaa-aaaa-67de6c3aa2ae',
        type: 'Inteckning',
        priorityOrder: 2,
        enrollmentDay: '2009-03-20',
        decision: 'Beviljad',
        diaryNumber: ['09/1013'],
        mortageType: 'Datapantbrev',
        mortageAmount: {
          currency: 'SEK',
          sum: 400000,
        },
      },
      {
        objectidentifier: 'd234ed25-aaaa-aaaa-aaaa-1912ba6637c4',
        type: 'Inteckning',
        priorityOrder: 3,
        enrollmentDay: '2015-11-14',
        decision: 'Beviljad',
        mortageType: 'Datapantbrev',
        mortageAmount: {
          currency: 'SEK',
          sum: 1000000,
        },
      },
      {
        objectidentifier: 'a33b4182-aaaa-aaaa-aaaa-001e7ce0e0f5',
        type: 'Inteckning',
        priorityOrder: 4,
        enrollmentDay: '2016-03-03',
        decision: 'Beviljad',
        mortageType: 'Datapantbrev',
        mortageAmount: {
          currency: 'SEK',
          sum: 900000,
        },
      },
      {
        objectidentifier: 'a56d6430-aaaa-aaaa-aaaa-d1bbb6e2e865',
        type: 'Inteckning',
        priorityOrder: 5,
        enrollmentDay: '2016-12-26',
        decision: 'Beviljad',
        mortageType: 'Datapantbrev',
        mortageAmount: {
          currency: 'SEK',
          sum: 700000,
        },
      },
    ],
    previousOwnership: [
      {
        type: 'Lagfart',
        objectidentifier: '2613a14d-aaaa-aaaa-aaaa-db451e020a91',
        enrollmentDay: '',
        decision: 'Beviljad',
        share: '0/1',
        diaryNumber: ['61/240'],
        versionValidFrom: '2013-04-22T11:52:01.168+02:00',
        owner: {
          idnumber: '111111-2222',
          name: 'TESTBOLAGET SUNDSVALL AB',
        },
      },
      {
        type: 'Lagfart',
        objectidentifier: 'f98d3951-aaaa-aaaa-aaaa-3bcd181bed5d',
        enrollmentDay: '1988-10-29',
        decision: 'Beviljad',
        share: '0/1',
        diaryNumber: ['88/18289'],
        versionValidFrom: '2013-05-22T11:52:01.168+02:00',
        owner: {
          idnumber: '111111-2222',
          name: 'TESTBOLAGET, T. TESTSSON AB',
        },
      },
      {
        type: 'Lagfart',
        objectidentifier: '5e6ff5e2-aaaa-aaaa-aaaa-de17544eae45',
        enrollmentDay: '2005-07-10',
        decision: 'Beviljad',
        share: '0/1',
        diaryNumber: ['05/16463'],
        versionValidFrom: '2015-11-11T13:18:28.494+01:00',
        owner: {
          idnumber: MOCK_PERSON_NUMBER,
          name: 'TESTAR TESTARSSON',
        },
      },
      {
        type: 'Lagfart',
        objectidentifier: 'f5b5a7ef-aaaa-aaaa-aaaa-fb4b1ca67bd6',
        enrollmentDay: '2015-09-09',
        decision: 'Beviljad',
        share: '0/1',
        versionValidFrom: '2017-01-02T13:30:54.097+01:00',
        owner: {
          idnumber: MOCK_PERSON_NUMBER,
          name: 'Test Testersson',
        },
      },
    ],
    actions: [
      {
        actionType1: 'avstyckning',
        actionType2: '',
        fileDesignation: '21-ABC-123',
        actionDate: '19380526',
        objectidentifier: 'a665f762-aaaa-aaaa-aaaa-8f16779cf889',
        littera: '',
        runningNumber: 1,
      },
    ],
  },
  message: 'success',
};

export const mockEstateInfo12 = {
  data: {
    designation: 'SUNDSVALL 1:2',
    district: 'Låtsasdistrikt',
    objectidentifier: '909a6a80-aaaa-aaaa-aaaa-ed8f66444c3g',
    totalArea: 1555,
    totalAreaWater: 0,
    totalAreaLand: 1555,
    ownerChanges: [],
    ownership: [],
    mortage: [],
    previousOwnership: [],
    actions: [],
  },
  message: 'success',
};

