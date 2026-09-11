/**
 * Deployment-owned mapping from a named handler role to the AD group whose members hold it.
 *
 * `ASSIGNABLE_HANDLER_GROUPS` names the same directory groups but flattens them into one list, which
 * loses the only thing an assignment flow needs to know: which role a handler holds. A deployment
 * that has to tell a LEX manager from a LEX investigator configures this instead, and the flat list
 * is derived from it.
 *
 * This grants nothing. It populates the handler selector and lets an assignment step require a
 * specific role; login, admin privileges and investigation document access stay where they are.
 */
export interface HandlerGroupRole {
  /** Stable client-facing identifier for the role. */
  readonly key: string;
  /** Presentation only: the group heading shown above the role's members. */
  readonly label: string;
  /** AD group name, kept verbatim so it survives the directory lookup unchanged. */
  readonly group: string;
}

const ROLE_KEYS = new Set(['key', 'label', 'group']);
const ROLE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readRequiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
};

/**
 * Parses `HANDLER_GROUP_ROLES`. Missing configuration is a legal state: only the applications that
 * assign by role configure this, so requiring it would make every other deployment carry a setting
 * it has no use for. Array order is display order.
 */
export const resolveHandlerGroupRoles = (configuredRoles = process.env.HANDLER_GROUP_ROLES): readonly HandlerGroupRole[] | undefined => {
  if (!configuredRoles?.trim()) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredRoles);
  } catch {
    throw new SyntaxError('HANDLER_GROUP_ROLES must contain valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new TypeError('HANDLER_GROUP_ROLES must be an array');
  }
  if (parsed.length === 0) {
    throw new Error('HANDLER_GROUP_ROLES must name at least one role');
  }

  const roleKeys = new Set<string>();
  const roles = parsed.map((candidate, index) => {
    const path = `HANDLER_GROUP_ROLES[${index}]`;
    if (!isRecord(candidate)) throw new Error(`${path} must be an object`);

    const unknownKeys = Object.keys(candidate).filter(key => !ROLE_KEYS.has(key));
    if (unknownKeys.length > 0) {
      throw new Error(`${path} contains unknown keys: ${unknownKeys.join(', ')}`);
    }

    const key = readRequiredString(candidate.key, `${path}.key`);
    if (!ROLE_KEY_PATTERN.test(key)) {
      throw new Error(`${path}.key must be a lowercase kebab-case identifier`);
    }
    if (roleKeys.has(key)) throw new Error(`${path} duplicates role key ${key}`);
    roleKeys.add(key);

    return Object.freeze({
      key,
      label: readRequiredString(candidate.label, `${path}.label`),
      group: readRequiredString(candidate.group, `${path}.group`),
    });
  });

  return Object.freeze(roles);
};

/**
 * Looks up one configured role. Callers requiring a role for a specific assignment step use this so
 * a missing or renamed role fails loudly instead of silently assigning to nobody.
 */
export const findHandlerGroupRole = (roles: readonly HandlerGroupRole[] | undefined, key: string): HandlerGroupRole | undefined =>
  roles?.find(role => role.key === key);
