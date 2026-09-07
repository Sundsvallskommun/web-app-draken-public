export interface SupportInvestigationDocumentGroupGrant {
  readonly documentKey: string;
  /** AD group names, lowercased to match the session's own normalization of the SAML assertion. */
  readonly editorGroups: readonly string[];
  /** AD groups that reach the document read-only. Write always implies read, so an editor group need not be repeated here. */
  readonly readerGroups: readonly string[];
}

const GRANT_KEYS = new Set(['documentKey', 'groups', 'editorGroups', 'readerGroups']);
const DOCUMENT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const NO_GROUPS: readonly string[] = Object.freeze([]);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readRequiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
};

const readGroups = (value: unknown, path: string): readonly string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} must be a non-empty array`);
  }
  const seen = new Set<string>();
  const groups = value.map((candidate, index) => {
    const group = readRequiredString(candidate, `${path}[${index}]`).toLowerCase();
    if (seen.has(group)) throw new Error(`${path} contains duplicate group ${group}`);
    seen.add(group);
    return group;
  });
  return Object.freeze(groups);
};

/** An omitted list is legal; a present one still has to name at least one group. */
const readOptionalGroups = (value: unknown, path: string): readonly string[] | undefined =>
  value === undefined ? undefined : readGroups(value, path);

/**
 * Parses the deployment-owned mapping from investigation document to the AD groups whose members
 * reach it at all. Missing configuration is a legal state and deliberately distinct from an empty
 * mapping: only the applications that actually run investigation configure this, so requiring it
 * would make every other deployment carry a setting it has no use for.
 *
 * A grant separates the groups that may change the document from those that may only read it.
 * `groups` remains accepted as the original spelling of `editorGroups`, so a deployment written
 * before read access existed keeps meaning what it meant: those groups write.
 */
export const resolveSupportInvestigationDocumentGroups = (
  configuredGroups = process.env.SUPPORT_INVESTIGATION_DOCUMENT_GROUPS,
): readonly SupportInvestigationDocumentGroupGrant[] | undefined => {
  if (!configuredGroups?.trim()) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredGroups);
  } catch {
    throw new SyntaxError('SUPPORT_INVESTIGATION_DOCUMENT_GROUPS must contain valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new TypeError('SUPPORT_INVESTIGATION_DOCUMENT_GROUPS must be an array');
  }

  const documentKeys = new Set<string>();
  const grants = parsed.map((candidate, index) => {
    const path = `SUPPORT_INVESTIGATION_DOCUMENT_GROUPS[${index}]`;
    if (!isRecord(candidate)) throw new Error(`${path} must be an object`);

    const unknownKeys = Object.keys(candidate).filter(key => !GRANT_KEYS.has(key));
    if (unknownKeys.length > 0) {
      throw new Error(`${path} contains unknown keys: ${unknownKeys.join(', ')}`);
    }

    const documentKey = readRequiredString(candidate.documentKey, `${path}.documentKey`);
    if (!DOCUMENT_KEY_PATTERN.test(documentKey)) {
      throw new Error(`${path}.documentKey must be a lowercase kebab-case identifier`);
    }
    if (documentKeys.has(documentKey)) throw new Error(`${path} duplicates document key ${documentKey}`);
    documentKeys.add(documentKey);

    const legacyEditorGroups = readOptionalGroups(candidate.groups, `${path}.groups`);
    const namedEditorGroups = readOptionalGroups(candidate.editorGroups, `${path}.editorGroups`);
    if (legacyEditorGroups && namedEditorGroups) {
      throw new Error(`${path} must not combine groups and editorGroups`);
    }

    const editorGroups = namedEditorGroups ?? legacyEditorGroups ?? NO_GROUPS;
    const readerGroups = readOptionalGroups(candidate.readerGroups, `${path}.readerGroups`) ?? NO_GROUPS;
    if (editorGroups.length === 0 && readerGroups.length === 0) {
      throw new Error(`${path} must name editorGroups, readerGroups or groups`);
    }

    return Object.freeze({ documentKey, editorGroups, readerGroups });
  });

  return Object.freeze(grants);
};

/**
 * A grant naming a document the application does not have is a configuration mistake that would
 * otherwise be invisible: the document simply stays uneditable for everyone. Checked at startup so
 * it surfaces as a boot failure rather than as a support ticket about a locked form.
 */
export const assertSupportInvestigationDocumentGroupsMatchProfile = (
  profileDocumentKeys: readonly string[],
  grants: readonly SupportInvestigationDocumentGroupGrant[] | undefined,
): void => {
  if (!grants) return;

  const knownDocumentKeys = new Set(profileDocumentKeys);
  const unknownGrant = grants.find(grant => !knownDocumentKeys.has(grant.documentKey));
  if (unknownGrant) {
    throw new Error(
      `SUPPORT_INVESTIGATION_DOCUMENT_GROUPS names document ${unknownGrant.documentKey}, which this application's investigation profile does not contain`,
    );
  }
};
