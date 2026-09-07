export interface SupportInvestigationDocumentGroupGrant {
  readonly documentKey: string;
  /** AD group names, lowercased to match the session's own normalization of the SAML assertion. */
  readonly groups: readonly string[];
}

const GRANT_KEYS = new Set(['documentKey', 'groups']);
const DOCUMENT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

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

/**
 * Parses the deployment-owned mapping from investigation document to the AD groups whose members
 * reach it at all. Missing configuration is a legal state and deliberately distinct from an empty
 * mapping: only the applications that actually run investigation configure this, so requiring it
 * would make every other deployment carry a setting it has no use for.
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

    return Object.freeze({ documentKey, groups: readGroups(candidate.groups, `${path}.groups`) });
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
