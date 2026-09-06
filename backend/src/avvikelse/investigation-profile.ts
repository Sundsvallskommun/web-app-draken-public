import {
  createSupportInvestigationProfile,
  SupportInvestigationProfile,
  SupportInvestigationProfileInput,
} from '@/config/support-investigation-profile';

import { resolveIafVofInvestigationClassificationPolicy } from './classification-policy';

/** Bind Avvikelse's business rules to SM's reusable document/profile contract. */
export const createAvvikelseInvestigationProfile = (input: SupportInvestigationProfileInput): SupportInvestigationProfile => {
  const profile = createSupportInvestigationProfile(input);
  const classificationPolicy = resolveIafVofInvestigationClassificationPolicy(profile);
  return Object.freeze({ ...profile, ...(classificationPolicy ? { classificationPolicy } : {}) });
};

const iafVofInvestigationProfileBase = {
  requiredSupportManagementApiTarget: 'sprint',
  documents: [
    {
      key: 'utredning-enhetschef',
      schemaName: 'utredning-enhetschef',
      tabLabel: 'Utredning enhetschef',
      ownerLabel: 'Enhetschef',
    },
    {
      key: 'utredning-sol-lss',
      schemaName: 'utredning-sol-lss',
      tabLabel: 'Utredning SoL/LSS',
      ownerLabel: 'LEX-utredare',
    },
    {
      key: 'utredning-hsl',
      schemaName: 'utredning-hsl',
      tabLabel: 'Utredning HSL',
      ownerLabel: 'MAS/MAR',
    },
  ],
  labelFilter: {
    groups: [
      {
        key: 'provision',
        label: 'Lagrum',
        rootResourcePath: 'PROVISION',
        fields: [{ key: 'provision', label: 'Lagrum', classification: 'PROVISION' }],
      },
      {
        key: 'report-type',
        label: 'Rapporttyp',
        rootResourcePath: 'REPORT_TYPE',
        fields: [{ key: 'report-type', label: 'Rapporttyp', classification: 'REPORT_TYPE' }],
      },
      {
        key: 'classification',
        label: 'Klassificering',
        rootResourcePath: 'CATEGORY',
        fields: [
          { key: 'category', label: 'Avvikelsetyp', classification: 'CATEGORY' },
          { key: 'type', label: 'Underkategori', classification: 'TYPE' },
        ],
      },
    ],
  },
} as const satisfies Omit<SupportInvestigationProfileInput, 'application'>;

const createIafVofInvestigationProfile = (application: 'IAF' | 'VOF'): SupportInvestigationProfile =>
  createAvvikelseInvestigationProfile({ application, ...iafVofInvestigationProfileBase });

export const IAF_SUPPORT_INVESTIGATION_PROFILE = createIafVofInvestigationProfile('IAF');
export const VOF_SUPPORT_INVESTIGATION_PROFILE = createIafVofInvestigationProfile('VOF');
