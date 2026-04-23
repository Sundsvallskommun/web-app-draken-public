export const mockDraftAsset = {
  data: [
    {
      id: 'draft-asset-1',
      assetId: 'PRH-2025-000865',
      origin: 'CASEDATA',
      partyId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      type: 'FTErrandAssets',
      issued: '2025-01-01',
      validTo: '2025-12-31',
      status: 'DRAFT',
      description: '',
      additionalParameters: {},
      jsonParameters: [
        {
          key: 'FTErrandAssets',
          value: {
            type: 'privat_fritid',
            validityType: 'tidsbegränsat',
            validFrom: '2025-01-01',
            validTo: '2025-12-31',
            transportMode: ['vanligt_sate_personbil'],
            mobilityAids: [],
            additionalAids: [],
            isWinterService: 'nej',
            notes: 'Testkommentar',
          },
          schemaId: 'mock-schema-id',
        },
      ],
    },
  ],
  message: 'success',
};

export const mockDraftAssetEmpty = {
  data: [],
  message: 'success',
};
