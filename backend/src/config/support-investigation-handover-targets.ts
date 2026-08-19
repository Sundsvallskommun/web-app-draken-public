export interface SupportInvestigationHandoverTarget {
  readonly municipalityId: string;
  readonly namespace: string;
  readonly documentKeys: readonly string[];
}

const TARGET_KEYS = new Set(['municipalityId', 'namespace', 'documentKeys']);
export const SUPPORT_INVESTIGATION_HANDOVER_NAMESPACE_PATTERN = /^[A-Za-z0-9_-]+$/u;
const DOCUMENT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readRequiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
};

const targetIdentity = ({ municipalityId, namespace }: Pick<SupportInvestigationHandoverTarget, 'municipalityId' | 'namespace'>): string =>
  `${municipalityId}\u0000${namespace.toLowerCase()}`;

const readDocumentKeys = (value: unknown, path: string): readonly string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} must be a non-empty array`);
  }
  const seen = new Set<string>();
  const keys = value.map((candidate, index) => {
    const key = readRequiredString(candidate, `${path}[${index}]`);
    if (!DOCUMENT_KEY_PATTERN.test(key)) throw new Error(`${path}[${index}] must be a lowercase kebab-case identifier`);
    if (seen.has(key)) throw new Error(`${path} contains duplicate document key ${key}`);
    seen.add(key);
    return key;
  });
  return Object.freeze(keys);
};

/**
 * Parses the deployment-owned allowlist for namespaces that are prepared to
 * receive protected investigation documents. Missing configuration is kept
 * distinct from an explicit empty allowlist so the runtime can report an
 * unavailable policy instead of silently guessing a target capability.
 */
export const resolveSupportInvestigationHandoverTargets = (
  configuredTargets = process.env.SUPPORT_INVESTIGATION_HANDOVER_TARGETS,
): readonly SupportInvestigationHandoverTarget[] | undefined => {
  if (!configuredTargets?.trim()) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredTargets);
  } catch {
    throw new Error('SUPPORT_INVESTIGATION_HANDOVER_TARGETS must contain valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('SUPPORT_INVESTIGATION_HANDOVER_TARGETS must be an array');
  }

  const identities = new Set<string>();
  const targets = parsed.map((candidate, index) => {
    const path = `SUPPORT_INVESTIGATION_HANDOVER_TARGETS[${index}]`;
    if (!isRecord(candidate)) throw new Error(`${path} must be an object`);

    const unknownKeys = Object.keys(candidate).filter(key => !TARGET_KEYS.has(key));
    if (unknownKeys.length > 0) {
      throw new Error(`${path} contains unknown keys: ${unknownKeys.join(', ')}`);
    }

    const municipalityId = readRequiredString(candidate.municipalityId, `${path}.municipalityId`);
    const namespace = readRequiredString(candidate.namespace, `${path}.namespace`);
    if (!SUPPORT_INVESTIGATION_HANDOVER_NAMESPACE_PATTERN.test(namespace)) {
      throw new Error(`${path}.namespace may only contain letters, numbers, underscores and hyphens`);
    }
    const documentKeys = readDocumentKeys(candidate.documentKeys, `${path}.documentKeys`);

    const target = Object.freeze({ municipalityId, namespace, documentKeys });
    const identity = targetIdentity(target);
    if (identities.has(identity)) throw new Error(`${path} duplicates an earlier target`);
    identities.add(identity);
    return target;
  });

  return Object.freeze(targets);
};

export const supportInvestigationHandoverTargetIdentity = targetIdentity;
