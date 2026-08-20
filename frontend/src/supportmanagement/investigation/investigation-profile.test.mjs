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

test('parses, normalizes and freezes a valid application-bound document profile', () => {
  const profile = parseInvestigationProfile(validProfile(), 'IAF');

  assert.equal(profile.application, 'IAF');
  assert.equal(profile.documents[0].schemaName, 'utredning-enhetschef');
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.documents));
  assert.ok(Object.isFrozen(profile.documents[0].permissions));
  assert.deepEqual(Object.keys(profile).sort(), ['application', 'documents', 'registration', 'state']);
});

test('accepts a valid inactive empty document profile', () => {
  assert.deepEqual(
    parseInvestigationProfile({ application: 'KC', state: 'inactive', registration: { mode: 'enabled' }, documents: [] }, 'kc'),
    { application: 'KC', state: 'inactive', registration: { mode: 'enabled' }, documents: [] }
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

test('drops classification policy extension data from the generic profile', () => {
  const profile = parseInvestigationProfile(
    {
      ...validProfile(),
      classificationPolicy: {
        strategy: 'reported-misconduct',
        defaultOwnerDocumentKey: 'manager-document',
        reportedMisconductOwnerDocumentKey: 'misconduct-document',
      },
    },
    'IAF'
  );

  assert.equal('classificationPolicy' in profile, false);
});

test('parses and deeply freezes a declarative label filter', () => {
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

  assert.equal(profile.labelFilter?.groups[0].key, 'classification');
  assert.ok(Object.isFrozen(profile.labelFilter));
  assert.ok(Object.isFrozen(profile.labelFilter?.groups[0].fields));
});

test('rejects ambiguous or unsafe label-filter definitions', () => {
  const profile = validProfile();
  Object.assign(profile, {
    labelFilter: {
      groups: [
        { key: 'first', label: 'First', rootResourcePath: 'CATEGORY', fields: [{ key: 'category', label: 'Category', classification: 'CATEGORY' }] },
        { key: 'second', label: 'Second', rootResourcePath: 'CATEGORY', fields: [{ key: 'type', label: 'Type', classification: 'TYPE' }] },
      ],
    },
  });
  assert.throws(() => parseInvestigationProfile(profile, 'IAF'), /duplicerade grupper eller rötter/u);
});

test('rejects malformed documents, states and registration capabilities', () => {
  const missingLabel = validProfile();
  missingLabel.documents[0].tabLabel = '   ';
  assert.throws(() => parseInvestigationProfile(missingLabel, 'IAF'), /documents\[0\]\.tabLabel/u);

  const unsafeKey = validProfile();
  unsafeKey.documents[0].key = '../manager-document';
  assert.throws(() => parseInvestigationProfile(unsafeKey, 'IAF'), /lowercase kebab-case-id/u);

  const unknownState = validProfile();
  unknownState.state = 'enabled';
  assert.throws(() => parseInvestigationProfile(unknownState, 'IAF'), /state är ogiltig/u);

  const unknownRegistration = validProfile();
  unknownRegistration.registration.mode = 'automatic';
  assert.throws(() => parseInvestigationProfile(unknownRegistration, 'IAF'), /registration är ogiltig/u);
});
