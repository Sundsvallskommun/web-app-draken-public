import {
  createSupportInvestigationProfile,
  getSupportInvestigationProfile,
  IAF_SUPPORT_INVESTIGATION_PROFILE,
  VOF_SUPPORT_INVESTIGATION_PROFILE,
} from '@/config/support-investigation-profile';
import { SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';

const expectedDocuments: SupportInvestigationProfileDto['documents'][number][] = [
  { key: 'utredning-enhetschef', schemaName: 'utredning-enhetschef', tabLabel: 'Utredning enhetschef', ownerLabel: 'Enhetschef' },
  { key: 'utredning-sol-lss', schemaName: 'utredning-sol-lss', tabLabel: 'Utredning Lex Sarah', ownerLabel: 'Lex Sarah' },
  { key: 'utredning-hsl', schemaName: 'utredning-hsl', tabLabel: 'Händelseanalys HSL', ownerLabel: 'MAS/MAR' },
  {
    key: 'beslut-hsl',
    schemaName: 'beslut-hsl',
    tabLabel: 'Beslut HSL',
    ownerLabel: 'MAS/MAR',
    placement: 'decision',
    appliesTo: 'hsl-deviation',
  },
  {
    key: 'beslut-sol-lss',
    schemaName: 'beslut-sol-lss',
    tabLabel: 'Beslut SoL/LSS',
    ownerLabel: 'LEX-ansvarig',
    placement: 'decision',
    appliesTo: 'reported-misconduct',
    prerequisiteDocumentKey: 'utredning-sol-lss',
  },
];

const expectDeepFrozen = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(expectDeepFrozen);
};

describe('support investigation profiles', () => {
  it('builds separate immutable IAF and VOF document profiles without classification policy data', () => {
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE).toMatchObject({
      application: 'IAF',
      requiredSupportManagementApiTarget: 'sprint',
      documents: expectedDocuments,
      labelFilter: {
        groups: [
          { key: 'provision', rootResourcePath: 'PROVISION' },
          { key: 'report-type', rootResourcePath: 'REPORT_TYPE' },
          { key: 'classification', rootResourcePath: 'CATEGORY' },
        ],
      },
    });
    expect('classificationPolicy' in IAF_SUPPORT_INVESTIGATION_PROFILE).toBe(false);
    expect(VOF_SUPPORT_INVESTIGATION_PROFILE).toEqual({ ...IAF_SUPPORT_INVESTIGATION_PROFILE, application: 'VOF' });
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.documents).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.documents);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.labelFilter).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.labelFilter);
    expectDeepFrozen(IAF_SUPPORT_INVESTIGATION_PROFILE);
    expectDeepFrozen(VOF_SUPPORT_INVESTIGATION_PROFILE);
  });

  it('resolves applications case-insensitively and fails closed for unknown applications', () => {
    expect(getSupportInvestigationProfile(' iaf ')).toBe(IAF_SUPPORT_INVESTIGATION_PROFILE);
    expect(getSupportInvestigationProfile('vof')).toBe(VOF_SUPPORT_INVESTIGATION_PROFILE);
    expect(getSupportInvestigationProfile('KC')).toEqual({ application: 'KC', documents: [] });
    expect(getSupportInvestigationProfile(undefined)).toEqual({ application: '', documents: [] });
  });

  it('canonicalizes advertised fields before they become document allowlist values', () => {
    expect(
      createSupportInvestigationProfile({
        application: ' future ',
        documents: [{ key: ' document-key ', schemaName: ' schema-name ', tabLabel: ' Tab ', ownerLabel: ' Owner ' }],
      }),
    ).toEqual({
      application: 'FUTURE',
      documents: [{ key: 'document-key', schemaName: 'schema-name', tabLabel: 'Tab', ownerLabel: 'Owner' }],
    });
  });

  it('preserves an application-defined number and order of documents', () => {
    const documents = Array.from({ length: 5 }, (_, index) => ({
      key: `document-${index + 1}`,
      schemaName: `schema-${index + 1}`,
      tabLabel: `Document ${index + 1}`,
      ownerLabel: `Owner ${index + 1}`,
    }));
    expect(createSupportInvestigationProfile({ application: 'FUTURE', documents }).documents).toEqual(documents);
  });

  it('deeply clones transport and label-filter data without introducing application behavior', () => {
    const documents = [{ key: 'future-document', schemaName: 'shared-schema', tabLabel: 'Future', ownerLabel: 'Owner' }];
    const labelFilter = {
      groups: [
        {
          key: 'future-filter',
          label: 'Future filter',
          rootResourcePath: 'FUTURE',
          fields: [{ key: 'future-field', label: 'Future field', classification: 'FUTURE' }],
        },
      ],
    };
    const profile = createSupportInvestigationProfile({
      application: 'FUTURE',
      requiredSupportManagementApiTarget: 'stable',
      documents,
      labelFilter,
    });

    expect(profile.requiredSupportManagementApiTarget).toBe('stable');
    expect(profile.labelFilter).toEqual(labelFilter);
    expect(profile.documents).not.toBe(documents);
    expect(profile.labelFilter).not.toBe(labelFilter);
    expectDeepFrozen(profile);
  });

  it('rejects an unsupported runtime transport requirement', () => {
    expect(() =>
      createSupportInvestigationProfile({ application: 'FUTURE', documents: [], requiredSupportManagementApiTarget: 'future' as 'sprint' }),
    ).toThrow('requires unsupported Support Management API target future');
  });

  it('rejects empty or unsafe document fields and duplicate keys', () => {
    const validDocument = expectedDocuments[0];
    const profile = (documents: SupportInvestigationProfileDto['documents']): SupportInvestigationProfileDto => ({ application: 'IAF', documents });

    expect(() => createSupportInvestigationProfile(profile([{ ...validDocument, tabLabel: ' ' }]))).toThrow(
      'documents[0].tabLabel must not be empty',
    );
    expect(() => createSupportInvestigationProfile(profile([validDocument, { ...validDocument, key: ` ${validDocument.key} ` }]))).toThrow(
      'duplicate document key utredning-enhetschef',
    );
    expect(() => createSupportInvestigationProfile(profile([{ ...validDocument, key: '../unsafe' }]))).toThrow(
      'documents[0].key must be a lowercase kebab-case identifier',
    );
  });

  it('carries placement and applicability only when configured, and rejects unknown values', () => {
    const decision = { key: 'decision', schemaName: 'decision', tabLabel: 'Beslut', ownerLabel: 'Owner' };
    const documents = createSupportInvestigationProfile({
      application: 'FUTURE',
      documents: [decision, { ...decision, key: 'restricted-decision', placement: 'decision', appliesTo: 'reported-misconduct' }],
    }).documents;

    expect(Object.keys(documents[0])).toEqual(['key', 'schemaName', 'tabLabel', 'ownerLabel']);
    expect(documents[1]).toEqual({ ...decision, key: 'restricted-decision', placement: 'decision', appliesTo: 'reported-misconduct' });
    expect(() =>
      createSupportInvestigationProfile({ application: 'FUTURE', documents: [{ ...decision, placement: 'sidebar' as 'decision' }] }),
    ).toThrow('documents[0].placement must be one of investigation, decision');
    expect(() => createSupportInvestigationProfile({ application: 'FUTURE', documents: [{ ...decision, appliesTo: 'sol' as 'all' }] })).toThrow(
      'documents[0].appliesTo must be one of all, reported-misconduct, hsl-deviation',
    );
  });

  it('carries a prerequisite only when it names another document of the profile', () => {
    const investigation = { key: 'investigation', schemaName: 'investigation', tabLabel: 'Utredning', ownerLabel: 'Owner' };
    const decision = { key: 'decision', schemaName: 'decision', tabLabel: 'Beslut', ownerLabel: 'Owner', prerequisiteDocumentKey: 'investigation' };

    expect(createSupportInvestigationProfile({ application: 'FUTURE', documents: [investigation, decision] }).documents[1]).toEqual(decision);
    expect(() => createSupportInvestigationProfile({ application: 'FUTURE', documents: [decision] })).toThrow(
      'documents[0].prerequisiteDocumentKey must name another document in the profile',
    );
    expect(() =>
      createSupportInvestigationProfile({ application: 'FUTURE', documents: [{ ...decision, prerequisiteDocumentKey: 'decision' }] }),
    ).toThrow('documents[0].prerequisiteDocumentKey must name another document in the profile');
    expect(() =>
      createSupportInvestigationProfile({ application: 'FUTURE', documents: [investigation, { ...decision, prerequisiteDocumentKey: '../x' }] }),
    ).toThrow('documents[1].prerequisiteDocumentKey must be a lowercase kebab-case identifier');
  });

  it('allows several document keys to reuse the same schema template', () => {
    const sharedSchemaDocuments = [expectedDocuments[0], { ...expectedDocuments[1], schemaName: expectedDocuments[0].schemaName }];
    expect(createSupportInvestigationProfile({ application: 'FUTURE', documents: sharedSchemaDocuments }).documents).toEqual(sharedSchemaDocuments);
  });
});
