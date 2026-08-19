import assert from 'node:assert/strict';
import test from 'node:test';

import { parseInvestigationProfile } from './investigation-profile.ts';

const validProfile = () => ({
  application: 'iaf',
  state: 'active',
  registration: { mode: 'disabled' },
  documents: [
    {
      key: 'manager-document',
      schemaName: 'utredning-enhetschef',
      tabLabel: 'Utredning enhetschef',
      ownerLabel: 'Enhetschef',
      permissions: { canRead: true, canWrite: true },
    },
    {
      key: 'misconduct-document',
      schemaName: 'utredning-sol-lss',
      tabLabel: 'Utredning SoL/LSS',
      ownerLabel: 'LEX-utredare',
      permissions: { canRead: true, canWrite: false },
    },
  ],
});

const classificationPolicy = (overrides = {}) => ({
  strategy: 'reported-misconduct',
  defaultOwnerDocumentKey: 'manager-document',
  reportedMisconductOwnerDocumentKey: 'misconduct-document',
  reportedMisconductSelector: {
    parameter: { key: 'reportKind', values: ['REGULATORY'] },
    labels: { resourcePaths: ['REPORT_KIND/REGULATORY'], resourceNames: ['REGULATORY'] },
  },
  labelTree: {
    root: { resource: 'CATEGORY', classification: 'CATEGORY_ROOT' },
    ownerClassification: 'PROVISION_CATEGORY',
    categoryClassification: 'CATEGORY',
    typeClassification: 'TYPE',
  },
  forcedLegalBases: ['ACT-B'],
  legalBasesPointer: '/assessment/applicableActs',
  legalBaseRules: [
    { legalBase: 'ACT-A', allowedClassificationCategories: ['CATEGORY/ACT_A'] },
    { legalBase: 'ACT-B', allowedClassificationCategories: ['CATEGORY/ACT_B'] },
  ],
  ...overrides,
});

test('parses, normalizes and freezes a valid application-bound profile', () => {
  const profile = parseInvestigationProfile(validProfile(), 'IAF');

  assert.equal(profile.application, 'IAF');
  assert.equal(profile.documents[0].key, 'manager-document');
  assert.equal(profile.documents[0].schemaName, 'utredning-enhetschef');
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.documents));
  assert.ok(Object.isFrozen(profile.documents[0]));
  assert.deepEqual(Object.keys(profile).sort(), ['application', 'documents', 'registration', 'state']);
});

test('accepts a valid inactive empty document profile', () => {
  assert.deepEqual(
    parseInvestigationProfile(
      { application: 'KC', state: 'inactive', registration: { mode: 'enabled' }, documents: [] },
      'kc'
    ),
    {
      application: 'KC',
      state: 'inactive',
      registration: { mode: 'enabled' },
      documents: [],
    }
  );
});

test('rejects a profile for another application', () => {
  assert.throws(() => parseInvestigationProfile(validProfile(), 'VOF'), /profilen gäller IAF/u);
});

test('rejects duplicate document keys but permits a shared schema template', () => {
  const duplicateKey = validProfile();
  duplicateKey.documents[1].key = duplicateKey.documents[0].key;
  assert.throws(() => parseInvestigationProfile(duplicateKey, 'IAF'), /duplicerade document keys/u);

  const sharedSchemaName = validProfile();
  sharedSchemaName.documents[1].schemaName = sharedSchemaName.documents[0].schemaName;
  assert.equal(parseInvestigationProfile(sharedSchemaName, 'IAF').documents[1].schemaName, 'utredning-enhetschef');
});

test('drops classification-shaped extension data from the generic profile', () => {
  const profile = parseInvestigationProfile(
    {
      ...validProfile(),
      classification: {
        strategy: 'application-specific',
        defaultOwnerDocumentKey: 'manager-document',
      },
    },
    'IAF'
  );

  assert.equal('classification' in profile, false);
});

test('parses and deeply freezes a declarative classification policy', () => {
  const profile = parseInvestigationProfile({ ...validProfile(), classificationPolicy: classificationPolicy() }, 'IAF');

  assert.deepEqual(profile.classificationPolicy, classificationPolicy());
  assert.ok(Object.isFrozen(profile.classificationPolicy));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.reportedMisconductSelector));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.reportedMisconductSelector.parameter.values));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.reportedMisconductSelector.labels.resourcePaths));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.labelTree));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.labelTree.root));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.forcedLegalBases));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.legalBaseRules));
  assert.ok(Object.isFrozen(profile.classificationPolicy?.legalBaseRules[0].allowedClassificationCategories));
});

test('rejects unsupported, dangling or internally inconsistent classification policies', () => {
  const withPolicy = (policy) => ({ ...validProfile(), classificationPolicy: policy });

  assert.throws(
    () => parseInvestigationProfile(withPolicy(classificationPolicy({ strategy: 'application-specific' })), 'IAF'),
    /classificationPolicy är ogiltig/u
  );
  assert.throws(
    () =>
      parseInvestigationProfile(
        withPolicy(classificationPolicy({ defaultOwnerDocumentKey: 'missing-document' })),
        'IAF'
      ),
    /okänt dokument/u
  );
  assert.throws(
    () => parseInvestigationProfile(withPolicy(classificationPolicy({ legalBasesPointer: '/__proto__/acts' })), 'IAF'),
    /legalBasesPointer är ogiltig/u
  );
  assert.throws(
    () => parseInvestigationProfile(withPolicy(classificationPolicy({ forcedLegalBases: ['UNKNOWN'] })), 'IAF'),
    /lagrum utan regel/u
  );
  assert.throws(
    () =>
      parseInvestigationProfile(
        withPolicy(
          classificationPolicy({
            legalBaseRules: [
              { legalBase: 'ACT-A', allowedClassificationCategories: ['CATEGORY/ACT_A'] },
              { legalBase: 'act-a', allowedClassificationCategories: ['CATEGORY/ACT_B'] },
            ],
          })
        ),
        'IAF'
      ),
    /legalBaseRules innehåller duplicerade värden/u
  );
  assert.throws(
    () => parseInvestigationProfile(withPolicy(classificationPolicy({ labelTree: undefined })), 'IAF'),
    /classificationPolicy\.labelTree är ogiltig/u
  );
  assert.throws(
    () =>
      parseInvestigationProfile(
        withPolicy(
          classificationPolicy({
            labelTree: {
              ...classificationPolicy().labelTree,
              typeClassification: 'category',
            },
          })
        ),
        'IAF'
      ),
    /labelTree måste använda unika klassificeringar/u
  );
  assert.throws(
    () =>
      parseInvestigationProfile(
        withPolicy(
          classificationPolicy({
            labelTree: {
              ...classificationPolicy().labelTree,
              root: { resource: 'FUTURE_CATEGORY', classification: 'FUTURE_CATEGORY_ROOT' },
            },
          })
        ),
        'IAF'
      ),
    /refererar utanför labelTree-roten/u
  );
});

test('rejects ambiguous or unsafe reported-misconduct selectors', () => {
  const withSelector = (selector) => ({
    ...validProfile(),
    classificationPolicy: classificationPolicy({ reportedMisconductSelector: selector }),
  });

  assert.throws(
    () =>
      parseInvestigationProfile(
        withSelector({
          parameter: { key: 'reportKind', values: ['REGULATORY', ' regulatory '] },
          labels: { resourcePaths: ['REPORT_KIND/REGULATORY'], resourceNames: ['REGULATORY'] },
        }),
        'IAF'
      ),
    /parameter.values innehåller duplicerade värden/u
  );
  assert.throws(
    () =>
      parseInvestigationProfile(
        withSelector({
          parameter: { key: 'reportKind', values: ['REGULATORY'] },
          labels: { resourcePaths: ["REPORT_KIND/' OR 1=1"], resourceNames: [] },
        }),
        'IAF'
      ),
    /labels.resourcePaths är ogiltig/u
  );
  assert.throws(
    () =>
      parseInvestigationProfile(
        withSelector({
          parameter: { key: 'reportKind', values: ['REGULATORY'] },
          labels: { resourcePaths: [], resourceNames: [] },
        }),
        'IAF'
      ),
    /labels är tom/u
  );
});

test('parses a declarative label-filter capability without application branches', () => {
  const profile = parseInvestigationProfile(
    {
      ...validProfile(),
      labelFilter: {
        groups: [
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
    },
    'IAF'
  );

  assert.deepEqual(profile.labelFilter?.groups[0], {
    key: 'classification',
    label: 'Klassificering',
    rootResourcePath: 'CATEGORY',
    fields: [
      { key: 'category', label: 'Avvikelsetyp', classification: 'CATEGORY' },
      { key: 'type', label: 'Underkategori', classification: 'TYPE' },
    ],
  });
  assert.ok(Object.isFrozen(profile.labelFilter));
  assert.ok(Object.isFrozen(profile.labelFilter?.groups[0].fields));
});

test('rejects ambiguous or unsafe label-filter definitions at the runtime boundary', () => {
  const duplicateRoot = {
    ...validProfile(),
    labelFilter: {
      groups: [
        {
          key: 'first',
          label: 'First',
          rootResourcePath: 'CATEGORY',
          fields: [{ key: 'category', label: 'Category', classification: 'CATEGORY' }],
        },
        {
          key: 'second',
          label: 'Second',
          rootResourcePath: 'CATEGORY',
          fields: [{ key: 'type', label: 'Type', classification: 'TYPE' }],
        },
      ],
    },
  };
  assert.throws(() => parseInvestigationProfile(duplicateRoot, 'IAF'), /duplicerade grupper eller rötter/u);

  const unsafeRoot = structuredClone(duplicateRoot);
  unsafeRoot.labelFilter.groups = [unsafeRoot.labelFilter.groups[0]];
  unsafeRoot.labelFilter.groups[0].rootResourcePath = "CATEGORY/' or status:'SOLVED";
  assert.throws(() => parseInvestigationProfile(unsafeRoot, 'IAF'), /rootResourcePath är ogiltig/u);
});

test('rejects malformed documents, states and registration capabilities', () => {
  const missingLabel = validProfile();
  missingLabel.documents[0].tabLabel = '   ';
  assert.throws(() => parseInvestigationProfile(missingLabel, 'IAF'), /documents\[0\]\.tabLabel/u);

  const unsafeKey = validProfile();
  unsafeKey.documents[0].key = '../manager-document';
  assert.throws(() => parseInvestigationProfile(unsafeKey, 'IAF'), /lowercase kebab-case-id/u);

  const unsafeSchemaName = validProfile();
  unsafeSchemaName.documents[0].schemaName = 'Manager_Schema';
  assert.throws(() => parseInvestigationProfile(unsafeSchemaName, 'IAF'), /lowercase kebab-case-id/u);

  const unknownState = validProfile();
  unknownState.state = 'enabled';
  assert.throws(() => parseInvestigationProfile(unknownState, 'IAF'), /state är ogiltig/u);

  const unknownRegistration = validProfile();
  unknownRegistration.registration.mode = 'automatic';
  assert.throws(() => parseInvestigationProfile(unknownRegistration, 'IAF'), /registration är ogiltig/u);
});
