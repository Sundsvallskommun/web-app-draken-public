import {
  createSupportInvestigationProfile,
  getSupportInvestigationProfile,
  IAF_SUPPORT_INVESTIGATION_PROFILE,
  VOF_SUPPORT_INVESTIGATION_PROFILE,
} from '@/config/support-investigation-profile';
import { SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';
import type { ReportedMisconductInvestigationClassificationPolicy } from '@/services/support-investigation-classification-owner';

const expectedDocuments = [
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
];

const expectDeepFrozen = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(expectDeepFrozen);
};

const createFutureClassificationPolicy = (): ReportedMisconductInvestigationClassificationPolicy => ({
  strategy: 'reported-misconduct',
  defaultOwnerDocumentKey: 'manager-document',
  reportedMisconductOwnerDocumentKey: 'specialist-document',
  reportedMisconductSelector: {
    parameter: { key: 'futureEventType', values: ['SPECIAL_CASE'] },
    labels: { resourcePaths: ['FUTURE_REPORT/SPECIAL_CASE'], resourceNames: ['SPECIAL_CASE'] },
  },
  labelTree: {
    root: { resource: 'FUTURE_CATEGORY', classification: 'FUTURE_CATEGORY_ROOT' },
    ownerClassification: 'FUTURE_OWNER',
    categoryClassification: 'FUTURE_CATEGORY',
    typeClassification: 'FUTURE_TYPE',
  },
  forcedLegalBases: ['FUTURE_ACT'],
  legalBasesPointer: '/legalBases',
  legalBaseRules: [{ legalBase: 'FUTURE_ACT', allowedClassificationCategories: ['FUTURE_CATEGORY/SPECIAL_CASE'] }],
});

describe('support investigation profiles', () => {
  it('builds separate IAF and VOF instances from the same profile base', () => {
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE).toMatchObject({
      application: 'IAF',
      requiredSupportManagementApiTarget: 'sprint',
      documents: expectedDocuments,
      classificationPolicy: {
        strategy: 'reported-misconduct',
        defaultOwnerDocumentKey: 'utredning-enhetschef',
        reportedMisconductOwnerDocumentKey: 'utredning-sol-lss',
        labelTree: {
          root: { resource: 'CATEGORY', classification: 'CATEGORY_ROOT' },
          ownerClassification: 'PROVISION_CATEGORY',
          categoryClassification: 'CATEGORY',
          typeClassification: 'TYPE',
        },
      },
      labelFilter: {
        groups: [
          { key: 'provision', rootResourcePath: 'PROVISION' },
          { key: 'report-type', rootResourcePath: 'REPORT_TYPE' },
          { key: 'classification', rootResourcePath: 'CATEGORY' },
        ],
      },
    });
    expect(VOF_SUPPORT_INVESTIGATION_PROFILE).toEqual({ ...IAF_SUPPORT_INVESTIGATION_PROFILE, application: 'VOF' });
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.documents).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.documents);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.documents[0]).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.documents[0]);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.classificationPolicy).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.classificationPolicy);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.classificationPolicy?.reportedMisconductSelector).not.toBe(
      VOF_SUPPORT_INVESTIGATION_PROFILE.classificationPolicy?.reportedMisconductSelector,
    );
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.classificationPolicy?.legalBaseRules).not.toBe(
      VOF_SUPPORT_INVESTIGATION_PROFILE.classificationPolicy?.legalBaseRules,
    );
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.labelFilter).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.labelFilter);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.labelFilter?.groups).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.labelFilter?.groups);
    expect(IAF_SUPPORT_INVESTIGATION_PROFILE.labelFilter?.groups[0].fields).not.toBe(VOF_SUPPORT_INVESTIGATION_PROFILE.labelFilter?.groups[0].fields);
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
        application: ' iaf ',
        documents: [
          {
            key: ' document-key ',
            schemaName: ' schema-name ',
            tabLabel: ' Tab label ',
            ownerLabel: ' Owner label ',
          },
        ],
      }),
    ).toEqual({
      application: 'IAF',
      documents: [
        {
          key: 'document-key',
          schemaName: 'schema-name',
          tabLabel: 'Tab label',
          ownerLabel: 'Owner label',
        },
      ],
    });
  });

  it('preserves an application-defined number and order of documents', () => {
    const documents = Array.from({ length: 5 }, (_, index) => ({
      key: `document-${index + 1}`,
      schemaName: `schema-${index + 1}`,
      tabLabel: `Document ${index + 1}`,
      ownerLabel: `Owner ${index + 1}`,
    }));

    const profile = createSupportInvestigationProfile({ application: 'FUTURE', documents });

    expect(profile.documents).toHaveLength(5);
    expect(profile.documents.map(document => document.key)).toEqual(documents.map(document => document.key));
  });

  it('creates a custom profile with capabilities without application-name inference or input aliasing', () => {
    const documents = [
      { key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' },
      { key: 'specialist-document', schemaName: 'shared-schema', tabLabel: 'Specialist', ownerLabel: 'Specialist' },
    ];
    const classificationPolicy = createFutureClassificationPolicy();
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

    const custom = createSupportInvestigationProfile({
      application: 'FUTURE',
      requiredSupportManagementApiTarget: 'stable',
      documents,
      classificationPolicy,
      labelFilter,
    });

    expect(custom.classificationPolicy).toMatchObject({
      defaultOwnerDocumentKey: 'manager-document',
      reportedMisconductOwnerDocumentKey: 'specialist-document',
    });
    expect(custom.requiredSupportManagementApiTarget).toBe('stable');
    expect(custom.labelFilter).toEqual(labelFilter);
    expect(custom.documents).not.toBe(documents);
    expect(custom.classificationPolicy).not.toBe(classificationPolicy);
    expect(custom.classificationPolicy?.reportedMisconductSelector).not.toBe(classificationPolicy.reportedMisconductSelector);
    expect(custom.classificationPolicy?.reportedMisconductSelector.parameter.values).not.toBe(
      classificationPolicy.reportedMisconductSelector.parameter.values,
    );
    expect(custom.classificationPolicy?.labelTree).not.toBe(classificationPolicy.labelTree);
    expect(custom.classificationPolicy?.labelTree.root).not.toBe(classificationPolicy.labelTree.root);
    expect(custom.classificationPolicy?.legalBaseRules).not.toBe(classificationPolicy.legalBaseRules);
    expect(custom.classificationPolicy?.legalBaseRules[0]).not.toBe(classificationPolicy.legalBaseRules[0]);
    expect(custom.classificationPolicy?.legalBaseRules[0].allowedClassificationCategories).not.toBe(
      classificationPolicy.legalBaseRules[0].allowedClassificationCategories,
    );
    expect(custom.labelFilter).not.toBe(labelFilter);
    expect(custom.labelFilter?.groups).not.toBe(labelFilter.groups);
    expect(custom.labelFilter?.groups[0].fields).not.toBe(labelFilter.groups[0].fields);
    expectDeepFrozen(custom);
  });

  it('rejects an unsupported runtime transport requirement at the profile boundary', () => {
    expect(() =>
      createSupportInvestigationProfile({
        application: 'FUTURE',
        documents: [],
        requiredSupportManagementApiTarget: 'future' as 'sprint',
      }),
    ).toThrow('requires unsupported Support Management API target future');
  });

  it('rejects a classification capability whose owners are not configured document keys', () => {
    expect(() =>
      createSupportInvestigationProfile({
        application: 'FUTURE',
        documents: [{ key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' }],
        classificationPolicy: { ...createFutureClassificationPolicy(), reportedMisconductOwnerDocumentKey: 'missing-document' },
      }),
    ).toThrow('classification owner missing-document is not a configured document key');
  });

  it.each(['legalBases', '/', '/legalBases//nested', '/__proto__', '/prototype', '/constructor', '/legal~2Bases'])(
    'rejects unsafe or invalid classification JSON pointer %s',
    legalBasesPointer => {
      expect(() =>
        createSupportInvestigationProfile({
          application: 'FUTURE',
          documents: [
            { key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' },
            { key: 'specialist-document', schemaName: 'shared-schema', tabLabel: 'Specialist', ownerLabel: 'Specialist' },
          ],
          classificationPolicy: { ...createFutureClassificationPolicy(), legalBasesPointer },
        }),
      ).toThrow('classificationPolicy.legalBasesPointer must be a safe absolute JSON pointer');
    },
  );

  it('rejects an owner selector without any label identity', () => {
    const policy = createFutureClassificationPolicy();
    expect(() =>
      createSupportInvestigationProfile({
        application: 'FUTURE',
        documents: [
          { key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' },
          { key: 'specialist-document', schemaName: 'shared-schema', tabLabel: 'Specialist', ownerLabel: 'Specialist' },
        ],
        classificationPolicy: {
          ...policy,
          reportedMisconductSelector: {
            ...policy.reportedMisconductSelector,
            labels: { resourcePaths: [], resourceNames: [] },
          },
        },
      }),
    ).toThrow('classificationPolicy.selector.labels must contain at least one selector');
  });

  it('rejects a forced legal base without a corresponding rule', () => {
    expect(() =>
      createSupportInvestigationProfile({
        application: 'FUTURE',
        documents: [
          { key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' },
          { key: 'specialist-document', schemaName: 'shared-schema', tabLabel: 'Specialist', ownerLabel: 'Specialist' },
        ],
        classificationPolicy: { ...createFutureClassificationPolicy(), forcedLegalBases: ['UNSUPPORTED_ACT'] },
      }),
    ).toThrow('forced legal base UNSUPPORTED_ACT has no legal-base rule');
  });

  it('rejects missing, unsafe, ambiguous or internally inconsistent classification label-tree semantics', () => {
    const documents = [
      { key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' },
      { key: 'specialist-document', schemaName: 'shared-schema', tabLabel: 'Specialist', ownerLabel: 'Specialist' },
    ];
    const profileWith = (labelTree: unknown, legalBaseCategory = 'FUTURE_CATEGORY/SPECIAL_CASE') =>
      createSupportInvestigationProfile({
        application: 'FUTURE',
        documents,
        classificationPolicy: {
          ...createFutureClassificationPolicy(),
          labelTree,
          legalBaseRules: [{ legalBase: 'FUTURE_ACT', allowedClassificationCategories: [legalBaseCategory] }],
        } as ReportedMisconductInvestigationClassificationPolicy,
      });

    expect(() => profileWith(undefined)).toThrow('classificationPolicy.labelTree must be configured');
    expect(() =>
      profileWith({
        ...createFutureClassificationPolicy().labelTree,
        root: { resource: "FUTURE/'unsafe", classification: 'FUTURE_ROOT' },
      }),
    ).toThrow('classificationPolicy.labelTree.root.resource must be a safe resourcePath');
    expect(() =>
      profileWith({
        ...createFutureClassificationPolicy().labelTree,
        typeClassification: 'FUTURE_CATEGORY',
      }),
    ).toThrow('classificationPolicy.labelTree must use distinct classification tokens');
    expect(() => profileWith(createFutureClassificationPolicy().labelTree, 'OTHER_ROOT/SPECIAL_CASE')).toThrow(
      'classification category OTHER_ROOT/SPECIAL_CASE is outside configured label-tree root FUTURE_CATEGORY',
    );
  });

  it('rejects empty or unsafe document fields and duplicate document keys', () => {
    const validDocument = expectedDocuments[0];
    const profile = (documents: SupportInvestigationProfileDto['documents']): SupportInvestigationProfileDto => ({
      application: 'IAF',
      documents,
    });

    expect(() => createSupportInvestigationProfile(profile([{ ...validDocument, tabLabel: ' ' }]))).toThrow(
      'documents[0].tabLabel must not be empty',
    );
    expect(() => createSupportInvestigationProfile(profile([validDocument, { ...validDocument, key: ` ${validDocument.key} ` }]))).toThrow(
      'duplicate document key utredning-enhetschef',
    );
    expect(() => createSupportInvestigationProfile(profile([{ ...validDocument, key: '../unsafe' }]))).toThrow(
      'documents[0].key must be a lowercase kebab-case identifier',
    );
    expect(() => createSupportInvestigationProfile(profile([{ ...validDocument, schemaName: 'Unsafe_Schema' }]))).toThrow(
      'documents[0].schemaName must be a lowercase kebab-case identifier',
    );
  });

  it('allows several document keys to reuse the same schema template', () => {
    const sharedSchemaDocuments = [expectedDocuments[0], { ...expectedDocuments[1], schemaName: expectedDocuments[0].schemaName }];

    expect(createSupportInvestigationProfile({ application: 'FUTURE', documents: sharedSchemaDocuments }).documents).toEqual(sharedSchemaDocuments);
  });
});
