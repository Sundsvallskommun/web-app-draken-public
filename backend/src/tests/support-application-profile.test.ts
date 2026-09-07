import { IAF_SUPPORT_APPLICATION_PROFILE, VOF_SUPPORT_APPLICATION_PROFILE } from '@/avvikelse/application-profile';
import {
  configureSupportApplicationProfile,
  getSupportApplicationProfile,
  SupportApplicationProfileInput,
} from '@/config/support-application-profile';
import { createSupportApplicationProfile } from '@/config/support-application-profile';
import { SupportApplicationProfileDto } from '@/dtos/support-application-profile.dto';

const expectedDocuments = [
  { key: 'utredning-enhetschef', schemaName: 'utredning-enhetschef', tabLabel: 'Utredning enhetschef', ownerLabel: 'Enhetschef' },
  { key: 'utredning-sol-lss', schemaName: 'utredning-sol-lss', tabLabel: 'Utredning SoL/LSS', ownerLabel: 'LEX-utredare' },
  { key: 'utredning-hsl', schemaName: 'utredning-hsl', tabLabel: 'Utredning HSL', ownerLabel: 'MAS/MAR' },
];

const expectDeepFrozen = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(expectDeepFrozen);
};

describe('support investigation profiles', () => {
  it('builds separate immutable IAF and VOF document profiles with server-only classification policy', () => {
    expect(IAF_SUPPORT_APPLICATION_PROFILE).toMatchObject({
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
    expect(IAF_SUPPORT_APPLICATION_PROFILE.classificationPolicy).toBeDefined();
    expect(VOF_SUPPORT_APPLICATION_PROFILE.documents).toEqual(IAF_SUPPORT_APPLICATION_PROFILE.documents);
    expect(VOF_SUPPORT_APPLICATION_PROFILE.application).toBe('VOF');
    expect(IAF_SUPPORT_APPLICATION_PROFILE).not.toBe(VOF_SUPPORT_APPLICATION_PROFILE);
    expect(IAF_SUPPORT_APPLICATION_PROFILE.documents).not.toBe(VOF_SUPPORT_APPLICATION_PROFILE.documents);
    expect(IAF_SUPPORT_APPLICATION_PROFILE.labelFilter).not.toBe(VOF_SUPPORT_APPLICATION_PROFILE.labelFilter);
    expectDeepFrozen(IAF_SUPPORT_APPLICATION_PROFILE);
    expectDeepFrozen(VOF_SUPPORT_APPLICATION_PROFILE);
  });

  it('serves only the profile selected by the application and fails closed for other identities', () => {
    configureSupportApplicationProfile(IAF_SUPPORT_APPLICATION_PROFILE);
    expect(getSupportApplicationProfile(' iaf ')).toBe(IAF_SUPPORT_APPLICATION_PROFILE);
    expect(getSupportApplicationProfile('VOF').documents).toEqual([]);
    expect(getSupportApplicationProfile('KC').documents).toEqual([]);
    expect(getSupportApplicationProfile(undefined)).toEqual({ application: '', documents: [], registration: { mode: 'disabled' } });
    configureSupportApplicationProfile(VOF_SUPPORT_APPLICATION_PROFILE);
    expect(getSupportApplicationProfile('vof')).toBe(VOF_SUPPORT_APPLICATION_PROFILE);
    expect(getSupportApplicationProfile('IAF').documents).toEqual([]);
  });

  it('canonicalizes advertised fields before they become document allowlist values', () => {
    expect(
      createSupportApplicationProfile({
        registration: { mode: 'disabled' },
        application: ' future ',
        documents: [{ key: ' document-key ', schemaName: ' schema-name ', tabLabel: ' Tab ', ownerLabel: ' Owner ' }],
      }),
    ).toEqual({
      application: 'FUTURE',
      registration: { mode: 'disabled' },
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
    expect(createSupportApplicationProfile({ registration: { mode: 'disabled' }, application: 'FUTURE', documents }).documents).toEqual(documents);
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
    const profile = createSupportApplicationProfile({
      registration: { mode: 'disabled' },
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
      createSupportApplicationProfile({
        registration: { mode: 'disabled' },
        application: 'FUTURE',
        documents: [],
        requiredSupportManagementApiTarget: 'future' as 'sprint',
      }),
    ).toThrow('requires unsupported Support Management API target future');
  });

  it('rejects empty or unsafe document fields and duplicate keys', () => {
    const validDocument = expectedDocuments[0];
    const profile = (documents: SupportApplicationProfileDto['documents']): SupportApplicationProfileInput => ({
      application: 'IAF',
      documents,
      registration: { mode: 'disabled' },
    });

    expect(() => createSupportApplicationProfile(profile([{ ...validDocument, tabLabel: ' ' }]))).toThrow('documents[0].tabLabel must not be empty');
    expect(() => createSupportApplicationProfile(profile([validDocument, { ...validDocument, key: ` ${validDocument.key} ` }]))).toThrow(
      'duplicate document key utredning-enhetschef',
    );
    expect(() => createSupportApplicationProfile(profile([{ ...validDocument, key: '../unsafe' }]))).toThrow(
      'documents[0].key must be a lowercase kebab-case identifier',
    );
  });

  it('allows several document keys to reuse the same schema template', () => {
    const sharedSchemaDocuments = [expectedDocuments[0], { ...expectedDocuments[1], schemaName: expectedDocuments[0].schemaName }];
    expect(
      createSupportApplicationProfile({ registration: { mode: 'disabled' }, application: 'FUTURE', documents: sharedSchemaDocuments }).documents,
    ).toEqual(sharedSchemaDocuments);
  });

  it('owns an immutable copy of registration defaults', () => {
    const defaults = {
      classification: { category: 'FUTURE', type: 'UNCLASSIFIED' },
      parameters: [{ key: 'kind', values: ['INITIAL'] }],
    };
    const profile = createSupportApplicationProfile({
      application: 'FUTURE',
      documents: [],
      registration: { mode: 'enabled', defaults },
    });
    defaults.classification.category = 'CHANGED';
    defaults.parameters[0].values.push('CHANGED');
    expect(profile.registration).toEqual({
      mode: 'enabled',
      defaults: { classification: { category: 'FUTURE', type: 'UNCLASSIFIED' }, parameters: [{ key: 'kind', values: ['INITIAL'] }] },
    });
    expectDeepFrozen(profile.registration);
  });
});
