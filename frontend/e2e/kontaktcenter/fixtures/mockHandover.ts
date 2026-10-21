// Mock data for the supportmanagement -> supportmanagement handover flow (KC -> another namespace).

// The backend delivers the casedata forwards (MEX, PT) as namespace configs like any other target.
export const mockMexTarget = {
  namespace: 'SBK_MEX',
  municipalityId: '2281',
  displayName: 'Mark och exploatering (MEX)',
  shortCode: 'MEX',
};

export const mockParkingPermitTarget = {
  namespace: 'SBK_PARKING_PERMIT',
  municipalityId: '2281',
  displayName: 'Parkeringstillstånd/Färdtjänst',
  shortCode: 'PT',
};

export const mockNamespaceConfigs = [
  mockMexTarget,
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

// A target categorized in its label tree. Resource paths deliberately do not follow the resource names:
// the preview's suggestions must be resolved by id.
export const mockLabelTarget = {
  namespace: 'SALARYANDPENSION',
  municipalityId: '2281',
  displayName: 'Lön och pension',
  shortCode: 'LOP',
};

const labelTargetType = (id: string, resourceName: string, resourcePath: string, displayName: string) => ({
  id,
  classification: 'TYPE',
  resourceName,
  resourcePath,
  displayName,
  labels: [],
});

export const mockLabelTargetMetadata = {
  labels: {
    labelStructure: [
      {
        id: 'label-salary',
        classification: 'CATEGORY',
        resourceName: 'SALARY',
        resourcePath: 'LON',
        displayName: 'Lön',
        labels: [
          labelTargetType('label-payslip', 'PAYSLIP', 'LON/SPEC', 'Lönespecifikation'),
          labelTargetType('label-salary-other', 'OTHER', 'LON/OVRIGT', 'Övrigt'),
        ],
      },
      {
        id: 'label-pension',
        classification: 'CATEGORY',
        resourceName: 'PENSION',
        resourcePath: 'PENSION',
        displayName: 'Pension',
        labels: [labelTargetType('label-pension-general', 'GENERAL', 'PENSION/ALLMANT', 'Allmänt')],
      },
    ],
  },
};

// The source errand's category and type both match in the target tree; the deeper match is preselected.
export const mockLabelTargetPreview = {
  ...mockHandoverPreview,
  mappingRequired: {
    ...mockHandoverPreview.mappingRequired,
    labels: {
      candidates: [
        { id: 'label-salary', displayName: 'Lön', resourcePath: 'LON' },
        { id: 'label-payslip', displayName: 'Lönespecifikation', resourcePath: 'LON/SPEC' },
        { id: 'label-salary-other', displayName: 'Övrigt', resourcePath: 'LON/OVRIGT' },
        { id: 'label-pension', displayName: 'Pension', resourcePath: 'PENSION' },
        { id: 'label-pension-general', displayName: 'Allmänt', resourcePath: 'PENSION/ALLMANT' },
      ],
      mappings: [
        {
          sourceId: 'source-category',
          sourceDisplayName: 'Lön',
          suggestedTargetId: 'label-salary',
          matchReason: 'DISPLAY_NAME_EXACT',
        },
        {
          sourceId: 'source-type',
          sourceDisplayName: 'Lönespecifikation',
          suggestedTargetId: 'label-payslip',
          matchReason: 'DISPLAY_NAME_EXACT',
        },
      ],
    },
  },
};

export const mockHandoverResult = {
  newErrandId: 'f0882f1d-06bc-47fd-b017-1d8307f5ce95',
  newErrandNumber: 'ROB-23010001',
  target: { namespace: 'ROB', municipalityId: '2281' },
  relationId: 'rel-1',
  appliedMappings: {},
  warnings: [],
};
