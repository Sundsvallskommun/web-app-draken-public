import { SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

interface DocumentAccessRule {
  readonly readGroups: ReadonlySet<string>;
  readonly writeGroups: ReadonlySet<string>;
}

export interface SupportInvestigationDocumentPermissions {
  readonly canRead: boolean;
  readonly canWrite: boolean;
}

interface JsonParameterContainer {
  readonly jsonParameters?: readonly { readonly key?: string }[];
}

interface RevisionDifference {
  readonly operations?: readonly { readonly path?: string }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readGroups = (value: unknown, path: string): ReadonlySet<string> => {
  if (!Array.isArray(value) || value.length === 0 || value.some(group => typeof group !== 'string' || group.trim() === '')) {
    throw new Error(`${path} must be a non-empty string array`);
  }
  return new Set(value.map(group => (group as string).trim().toLowerCase()));
};

/**
 * Owns per-document AD-group access. The mapping is deployment data because
 * group identifiers differ between environments; missing configuration fails
 * closed instead of silently falling back to the broad errand permission.
 */
export class SupportInvestigationAccessService {
  private readonly profile: SupportInvestigationProfileDto;
  private readonly rules = new Map<string, DocumentAccessRule>();
  readonly configured: boolean;

  constructor(profile: SupportInvestigationProfileDto, configuredAccess = process.env.SUPPORT_INVESTIGATION_DOCUMENT_ACCESS) {
    this.profile = profile;
    if (profile.documents.length === 0) {
      this.configured = true;
      return;
    }
    if (!configuredAccess?.trim()) {
      this.configured = false;
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(configuredAccess);
    } catch {
      throw new Error('SUPPORT_INVESTIGATION_DOCUMENT_ACCESS must contain valid JSON');
    }
    if (!isRecord(parsed)) throw new Error('SUPPORT_INVESTIGATION_DOCUMENT_ACCESS must be an object');

    const configuredKeys = new Set(Object.keys(parsed));
    for (const { key } of profile.documents) {
      const candidate = parsed[key];
      if (!isRecord(candidate)) throw new Error(`SUPPORT_INVESTIGATION_DOCUMENT_ACCESS is missing ${key}`);
      const read = readGroups(candidate.readGroups, `${key}.readGroups`);
      const write = readGroups(candidate.writeGroups, `${key}.writeGroups`);
      for (const group of write) {
        if (!read.has(group) && !read.has('*')) {
          throw new Error(`${key}.writeGroups must be a subset of readGroups`);
        }
      }
      this.rules.set(key, { readGroups: read, writeGroups: write });
      configuredKeys.delete(key);
    }
    if (configuredKeys.size > 0) {
      throw new Error(`SUPPORT_INVESTIGATION_DOCUMENT_ACCESS contains unknown keys: ${[...configuredKeys].join(', ')}`);
    }
    this.configured = true;
  }

  permissionsFor(user: User, key: string): SupportInvestigationDocumentPermissions {
    const rule = this.rules.get(key);
    if (!this.configured || !rule) return { canRead: false, canWrite: false };
    const groups = new Set((user.groups ?? []).map(group => group.trim().toLowerCase()));
    const matches = (allowed: ReadonlySet<string>) => allowed.has('*') || [...allowed].some(group => groups.has(group));
    return { canRead: matches(rule.readGroups), canWrite: matches(rule.writeGroups) };
  }

  assertCanRead(user: User, key: string): void {
    this.assertConfiguredDocument(key);
    if (!this.permissionsFor(user, key).canRead) throw new HttpException(403, 'Missing investigation document read access');
  }

  assertCanWrite(user: User, key: string): void {
    this.assertConfiguredDocument(key);
    if (!this.permissionsFor(user, key).canWrite) throw new HttpException(403, 'Missing investigation document write access');
  }

  filterProtectedJsonParameters<T extends { jsonParameters?: readonly { key?: string }[] }>(errand: T, user: User): T {
    if (!errand.jsonParameters) return errand;
    const protectedKeys = new Set(this.profile.documents.map(({ key }) => key));
    return {
      ...errand,
      jsonParameters: errand.jsonParameters.filter(
        parameter => !parameter.key || !protectedKeys.has(parameter.key) || this.permissionsFor(user, parameter.key).canRead,
      ),
    };
  }

  /**
   * Revision paths use array indexes below `/jsonParameters`, so a nested
   * operation does not reliably identify which document it belongs to. If a
   * user cannot read every configured document, remove the complete
   * json-parameter part of the diff instead of risking disclosure through an
   * indexed `value` or `fromValue`.
   */
  filterProtectedRevisionDifference<T extends RevisionDifference>(difference: T, user: User): T {
    if (!difference.operations || this.profile.documents.every(({ key }) => this.permissionsFor(user, key).canRead)) {
      return difference;
    }

    return {
      ...difference,
      operations: difference.operations.filter(operation => !this.isJsonParameterRevisionPath(operation.path)),
    };
  }

  /** Verifies only protected documents actually present on the errand. */
  assertCanReadProtectedJsonParameters(errand: JsonParameterContainer, user: User): void {
    for (const key of this.protectedJsonParameterKeys(errand)) {
      this.assertCanRead(user, key);
    }
  }

  protectedJsonParameterKeys(errand: JsonParameterContainer): readonly string[] {
    if (!errand.jsonParameters) return [];

    const protectedKeys = new Set(this.profile.documents.map(({ key }) => key));
    return [...new Set(errand.jsonParameters.flatMap(parameter => (parameter.key && protectedKeys.has(parameter.key) ? [parameter.key] : [])))];
  }

  private assertConfiguredDocument(key: string): void {
    if (!this.profile.documents.some(document => document.key === key)) {
      throw new HttpException(400, 'Unsupported investigation document key');
    }
    if (!this.configured) {
      throw new HttpException(503, 'Investigation document access configuration is unavailable');
    }
  }

  private isJsonParameterRevisionPath(path: string | undefined): boolean {
    return !path || path === '/' || path === '/jsonParameters' || path.startsWith('/jsonParameters/');
  }
}
