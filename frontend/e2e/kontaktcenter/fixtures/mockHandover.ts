// Mock data for the supportmanagement -> supportmanagement handover flow (KC -> another namespace).
// NOTE: this is a Playwright copy of cypress/e2e/kontaktcenter/fixtures/mockHandover.ts – keep in sync.

export const mockNamespaceConfigs = [
  {
    namespace: 'ROB',
    municipalityId: '2281',
    displayName: 'ROB',
    shortCode: 'ROB',
    accessControl: false,
  },
];

export const mockHandoverPreview = {
  directlyCopyable: {
    title: 'Empty errand',
    priority: 'MEDIUM',
    stakeholderCount: 1,
    externalTagCount: 2,
    attachmentCount: 0,
  },
  mappingRequired: {
    status: {
      source: { name: 'ONGOING', displayName: 'Pågående' },
      suggestedTarget: 'NEW_CASE',
      matchReason: 'DISPLAY_NAME_EXACT',
      candidates: [
        { name: 'NEW_CASE', displayName: 'Nytt ärende' },
        { name: 'ONGOING', displayName: 'Pågående' },
      ],
    },
    classification: {
      source: { category: 'CONTACT_SUNDSVALL', type: 'OTHER' },
      suggestedCategory: 'ADMINISTRATION',
      suggestedType: 'GENERAL',
      candidates: {
        ADMINISTRATION: ['GENERAL', 'OTHER'],
        SUPPORT: ['ISSUE'],
      },
    },
    labels: {
      candidates: [{ id: 'label-1', displayName: 'Brådskande', resourcePath: 'urgent' }],
      mappings: [
        { sourceId: 'source-1', sourceDisplayName: 'Viktig', suggestedTargetId: 'label-1', matchReason: 'DISPLAY_NAME_EXACT' },
      ],
    },
    contactReason: {
      source: 'Fråga',
      suggested: 'Allmän fråga',
      candidates: ['Allmän fråga', 'Klagomål'],
    },
  },
  sourceHandling: {
    statusCandidates: [
      { name: 'SOLVED', displayName: 'Löst' },
      { name: 'CLOSED', displayName: 'Stängt' },
    ],
  },
  notCopyable: [{ field: 'suspension', reason: 'Stöds inte i målnamespace' }],
  warnings: [{ type: 'ROLE_NOT_IN_TARGET', value: 'ADMINISTRATOR' }],
};

export const mockHandoverResult = {
  newErrandId: 'f0882f1d-06bc-47fd-b017-1d8307f5ce95',
  newErrandNumber: 'ROB-23010001',
  target: { namespace: 'ROB', municipalityId: '2281' },
  relationId: 'rel-1',
  appliedMappings: {},
  warnings: [],
};
