import {
  assertSupportInvestigationDocumentGroupsMatchProfile,
  resolveSupportInvestigationDocumentGroups,
} from '@/config/support-investigation-document-groups';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';

import { mockUser } from './helpers/http';
import {
  MOCK_HSL_INVESTIGATOR_GROUP,
  MOCK_INVESTIGATION_ADMIN_GROUP,
  MOCK_SOL_LSS_INVESTIGATOR_GROUP,
  MOCK_UNIT_MANAGER_GROUP,
} from './helpers/mock-data';

const MANAGER_DOCUMENT = 'utredning-enhetschef';
const SOL_LSS_DOCUMENT = 'utredning-sol-lss';
const HSL_DOCUMENT = 'utredning-hsl';

const configuredGroups = JSON.stringify([
  { documentKey: MANAGER_DOCUMENT, groups: [MOCK_UNIT_MANAGER_GROUP] },
  { documentKey: SOL_LSS_DOCUMENT, groups: [MOCK_SOL_LSS_INVESTIGATOR_GROUP] },
  { documentKey: HSL_DOCUMENT, groups: [MOCK_HSL_INVESTIGATOR_GROUP] },
]);

/** The same three documents, but with the unit manager reading the two investigator documents. */
const configuredReadAndWriteGroups = JSON.stringify([
  { documentKey: MANAGER_DOCUMENT, editorGroups: [MOCK_UNIT_MANAGER_GROUP] },
  { documentKey: SOL_LSS_DOCUMENT, editorGroups: [MOCK_SOL_LSS_INVESTIGATOR_GROUP], readerGroups: [MOCK_UNIT_MANAGER_GROUP] },
  { documentKey: HSL_DOCUMENT, editorGroups: [MOCK_HSL_INVESTIGATOR_GROUP], readerGroups: [MOCK_UNIT_MANAGER_GROUP] },
]);

const serviceWith = (configured: string) => new SupportInvestigationAccessService(resolveSupportInvestigationDocumentGroups(configured));

describe('support investigation document group configuration', () => {
  it('normalizes group names to lower case and freezes the mapping', () => {
    const grants = resolveSupportInvestigationDocumentGroups(
      JSON.stringify([{ documentKey: MANAGER_DOCUMENT, groups: [` ${MOCK_UNIT_MANAGER_GROUP.toUpperCase()} `] }]),
    );

    expect(grants).toEqual([{ documentKey: MANAGER_DOCUMENT, editorGroups: [MOCK_UNIT_MANAGER_GROUP], readerGroups: [] }]);
    expect(Object.isFrozen(grants)).toBe(true);
    expect(Object.isFrozen(grants?.[0])).toBe(true);
  });

  it.each([
    ['not-json', 'must contain valid JSON'],
    ['{}', 'must be an array'],
    ['[null]', '[0] must be an object'],
    ['[{"groups":["a"]}]', '[0].documentKey must be a non-empty string'],
    ['[{"documentKey":"Utredning_Enhetschef","groups":["a"]}]', 'must be a lowercase kebab-case identifier'],
    ['[{"documentKey":"utredning-enhetschef","groups":["a"],"typo":true}]', '[0] contains unknown keys: typo'],
    ['[{"documentKey":"utredning-enhetschef"}]', '[0] must name editorGroups, readerGroups or groups'],
    ['[{"documentKey":"utredning-enhetschef","groups":[]}]', '[0].groups must be a non-empty array'],
    ['[{"documentKey":"utredning-enhetschef","readerGroups":[]}]', '[0].readerGroups must be a non-empty array'],
    ['[{"documentKey":"utredning-enhetschef","editorGroups":[]}]', '[0].editorGroups must be a non-empty array'],
    ['[{"documentKey":"utredning-enhetschef","groups":["a"],"editorGroups":["b"]}]', '[0] must not combine groups and editorGroups'],
    ['[{"documentKey":"utredning-enhetschef","groups":["a","A"]}]', '[0].groups contains duplicate group a'],
    ['[{"documentKey":"utredning-enhetschef","readerGroups":["a","A"]}]', '[0].readerGroups contains duplicate group a'],
    [
      '[{"documentKey":"utredning-enhetschef","groups":["a"]},{"documentKey":"utredning-enhetschef","groups":["b"]}]',
      '[1] duplicates document key utredning-enhetschef',
    ],
  ])('rejects invalid configuration %s', (configured, message) => {
    expect(() => resolveSupportInvestigationDocumentGroups(configured)).toThrow(message);
  });

  it('treats absent configuration as unconfigured rather than as an empty mapping', () => {
    expect(resolveSupportInvestigationDocumentGroups('')).toBeUndefined();
    expect(resolveSupportInvestigationDocumentGroups('   ')).toBeUndefined();
    expect(resolveSupportInvestigationDocumentGroups('[]')).toEqual([]);
  });

  it('rejects a mapping that names a document this application does not have', () => {
    const grants = resolveSupportInvestigationDocumentGroups(JSON.stringify([{ documentKey: 'utredning-okand', readerGroups: ['a'] }]));

    expect(() => assertSupportInvestigationDocumentGroupsMatchProfile([MANAGER_DOCUMENT], grants)).toThrow(
      'names document utredning-okand, which this application',
    );
    expect(() => assertSupportInvestigationDocumentGroupsMatchProfile([MANAGER_DOCUMENT], undefined)).not.toThrow();
  });
});

describe('SupportInvestigationAccessService', () => {
  it('leaves every document editable when the deployment maps no groups', () => {
    const service = serviceWith('');
    const user = mockUser({ groups: [] });

    expect(service.isConfigured()).toBe(false);
    expect(service.resolveDocumentAccess(user, MANAGER_DOCUMENT)).toBe('edit');
    expect(service.resolveDocumentAccess(user, HSL_DOCUMENT)).toBe('edit');
    expect(() => service.assertCanReadDocument(user, HSL_DOCUMENT)).not.toThrow();
    expect(() => service.assertCanWriteDocument(user, HSL_DOCUMENT)).not.toThrow();
  });

  it('grants edit only on the documents the user is mapped to, and hides the rest', () => {
    const service = serviceWith(configuredGroups);
    const unitManager = mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] });

    expect(service.isConfigured()).toBe(true);
    expect(service.resolveDocumentAccess(unitManager, MANAGER_DOCUMENT)).toBe('edit');
    expect(service.resolveDocumentAccess(unitManager, SOL_LSS_DOCUMENT)).toBe('hidden');
    expect(service.resolveDocumentAccess(unitManager, HSL_DOCUMENT)).toBe('hidden');
  });

  it('matches the group case-insensitively, as the session lowercases the SAML assertion', () => {
    const service = serviceWith(configuredGroups);
    const investigator = mockUser({ groups: [MOCK_HSL_INVESTIGATOR_GROUP.toUpperCase()] });

    expect(service.resolveDocumentAccess(investigator, HSL_DOCUMENT)).toBe('edit');
  });

  it('lets one user hold several document roles at once', () => {
    const service = serviceWith(configuredGroups);
    const both = mockUser({ groups: [MOCK_SOL_LSS_INVESTIGATOR_GROUP, MOCK_HSL_INVESTIGATOR_GROUP] });

    expect(service.resolveDocumentAccess(both, SOL_LSS_DOCUMENT)).toBe('edit');
    expect(service.resolveDocumentAccess(both, HSL_DOCUMENT)).toBe('edit');
    expect(service.resolveDocumentAccess(both, MANAGER_DOCUMENT)).toBe('hidden');
  });

  it('hides a document nobody is mapped to, from everyone', () => {
    const service = serviceWith(JSON.stringify([{ documentKey: MANAGER_DOCUMENT, groups: [MOCK_UNIT_MANAGER_GROUP] }]));
    const unitManager = mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] });

    expect(service.resolveDocumentAccess(unitManager, HSL_DOCUMENT)).toBe('hidden');
  });

  it('refuses every reach for a document the user is not mapped to', () => {
    const service = serviceWith(configuredGroups);
    const unitManager = mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] });

    expect(() => service.assertCanReadDocument(unitManager, MANAGER_DOCUMENT)).not.toThrow();
    expect(() => service.assertCanWriteDocument(unitManager, MANAGER_DOCUMENT)).not.toThrow();
    expect(() => service.assertCanReadDocument(unitManager, HSL_DOCUMENT)).toThrow(
      expect.objectContaining({ status: 403, message: 'Missing permissions for this investigation document' }),
    );
    expect(() => service.assertCanWriteDocument(unitManager, HSL_DOCUMENT)).toThrow(
      expect.objectContaining({ status: 403, message: 'Missing write permissions for this investigation document' }),
    );
  });

  it('grants a reader group the document read-only', () => {
    const service = serviceWith(configuredReadAndWriteGroups);
    const unitManager = mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] });

    expect(service.resolveDocumentAccess(unitManager, MANAGER_DOCUMENT)).toBe('edit');
    expect(service.resolveDocumentAccess(unitManager, SOL_LSS_DOCUMENT)).toBe('read');
    expect(service.resolveDocumentAccess(unitManager, HSL_DOCUMENT)).toBe('read');
  });

  it('lets a reader load the document but refuses the write', () => {
    const service = serviceWith(configuredReadAndWriteGroups);
    const unitManager = mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] });

    expect(() => service.assertCanReadDocument(unitManager, HSL_DOCUMENT)).not.toThrow();
    expect(() => service.assertCanWriteDocument(unitManager, HSL_DOCUMENT)).toThrow(
      expect.objectContaining({ status: 403, message: 'Missing write permissions for this investigation document' }),
    );
  });

  it('leaves the owner of a document editing it even though others may read it', () => {
    const service = serviceWith(configuredReadAndWriteGroups);
    const investigator = mockUser({ groups: [MOCK_HSL_INVESTIGATOR_GROUP] });

    expect(service.resolveDocumentAccess(investigator, HSL_DOCUMENT)).toBe('edit');
    expect(service.resolveDocumentAccess(investigator, MANAGER_DOCUMENT)).toBe('hidden');
    expect(() => service.assertCanWriteDocument(investigator, HSL_DOCUMENT)).not.toThrow();
  });

  // Write implies read, so naming the same group on both lists can only ever mean the stronger one.
  it('resolves a group named as both reader and editor to edit', () => {
    const service = serviceWith(
      JSON.stringify([{ documentKey: HSL_DOCUMENT, editorGroups: [MOCK_HSL_INVESTIGATOR_GROUP], readerGroups: [MOCK_HSL_INVESTIGATOR_GROUP] }]),
    );

    expect(service.resolveDocumentAccess(mockUser({ groups: [MOCK_HSL_INVESTIGATOR_GROUP] }), HSL_DOCUMENT)).toBe('edit');
  });

  it('hides a document from a user in neither of its lists', () => {
    const service = serviceWith(configuredReadAndWriteGroups);
    const investigator = mockUser({ groups: [MOCK_SOL_LSS_INVESTIGATOR_GROUP] });

    expect(service.resolveDocumentAccess(investigator, MANAGER_DOCUMENT)).toBe('hidden');
  });

  it('reads the original groups spelling as write access, so an existing deployment keeps working', () => {
    const service = serviceWith(configuredGroups);
    const investigator = mockUser({ groups: [MOCK_HSL_INVESTIGATOR_GROUP] });

    expect(service.resolveDocumentAccess(investigator, HSL_DOCUMENT)).toBe('edit');
    expect(() => service.assertCanWriteDocument(investigator, HSL_DOCUMENT)).not.toThrow();
  });

  /**
   * The shape avvikelse deploys: each investigator owns one document, the two clinical roles read
   * each other's and the unit manager's, the unit manager reads only their own, and an admin group
   * writes everything. Written out in full because the asymmetry is the point - a role reading a
   * document it may not write is exactly what per-key read access was added for.
   */
  describe('the deployed avvikelse matrix', () => {
    const service = serviceWith(
      JSON.stringify([
        {
          documentKey: MANAGER_DOCUMENT,
          editorGroups: [MOCK_UNIT_MANAGER_GROUP, MOCK_INVESTIGATION_ADMIN_GROUP],
          readerGroups: [MOCK_HSL_INVESTIGATOR_GROUP, MOCK_SOL_LSS_INVESTIGATOR_GROUP],
        },
        {
          documentKey: SOL_LSS_DOCUMENT,
          editorGroups: [MOCK_SOL_LSS_INVESTIGATOR_GROUP, MOCK_INVESTIGATION_ADMIN_GROUP],
          readerGroups: [MOCK_HSL_INVESTIGATOR_GROUP],
        },
        {
          documentKey: HSL_DOCUMENT,
          editorGroups: [MOCK_HSL_INVESTIGATOR_GROUP, MOCK_INVESTIGATION_ADMIN_GROUP],
          readerGroups: [MOCK_SOL_LSS_INVESTIGATOR_GROUP],
        },
      ]),
    );
    const accessFor = (group: string) =>
      [MANAGER_DOCUMENT, SOL_LSS_DOCUMENT, HSL_DOCUMENT].map(documentKey =>
        service.resolveDocumentAccess(mockUser({ groups: [group] }), documentKey),
      );

    it.each([
      ['the unit manager writes their own document and reaches neither investigation', MOCK_UNIT_MANAGER_GROUP, ['edit', 'hidden', 'hidden']],
      ['MAS/MAR writes HSL and reads the other two', MOCK_HSL_INVESTIGATOR_GROUP, ['read', 'read', 'edit']],
      ['the LEX investigator writes SoL/LSS and reads the other two', MOCK_SOL_LSS_INVESTIGATOR_GROUP, ['read', 'edit', 'read']],
      ['the admin group writes every document', MOCK_INVESTIGATION_ADMIN_GROUP, ['edit', 'edit', 'edit']],
    ])('%s', (_name, group, expected) => {
      expect(accessFor(group)).toEqual(expected);
    });
  });

  it('grants nothing to a user carrying no groups at all', () => {
    const service = serviceWith(configuredGroups);
    const user = mockUser({ groups: undefined });

    expect(service.resolveDocumentAccess(user, MANAGER_DOCUMENT)).toBe('hidden');
  });
});
