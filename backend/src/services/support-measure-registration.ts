import { MetadataResponse, Role } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { logger } from '@/utils/logger';

interface MeasureRegistrationRule {
  roleName: string;
  adGroups: string[];
  measureGroup: string;
  /** A deciding role's own measures are accepted on creation; every other role registers proposals. */
  decides: boolean;
}

export interface MeasureRegistrationPolicy {
  status: 'ready' | 'unconfigured' | 'invalid';
  roleTypes: { roleName: string; measureTypeIds: string[]; decides: boolean }[];
}

export interface ResolvedMeasureRegistration {
  creationRoles: Role[];
  registration: MeasureRegistrationPolicy;
}

const configurationName = 'SUPPORT_MEASURE_REGISTRATION';

function readRules(configured: string): MeasureRegistrationRule[] {
  const parsed: unknown = JSON.parse(configured);
  if (!Array.isArray(parsed)) throw new Error(`${configurationName} must be an array`);
  const seenRoles = new Set<string>();
  return parsed.map((entry: unknown, index) => {
    const location = `${configurationName}[${index}]`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) throw new Error(`${location} must be an object`);
    const rule = entry as Record<string, unknown>;
    if (Object.keys(rule).some(key => !['roleName', 'adGroups', 'measureGroup', 'decides'].includes(key))) {
      throw new Error(`${location} contains an unknown field`);
    }
    if (typeof rule.roleName !== 'string' || !rule.roleName.trim()) throw new Error(`${location}.roleName is required`);
    const roleName = rule.roleName.trim();
    if (seenRoles.has(roleName)) throw new Error(`${location} repeats a roleName`);
    seenRoles.add(roleName);
    if (!Array.isArray(rule.adGroups) || rule.adGroups.length === 0) throw new Error(`${location}.adGroups must name at least one group`);
    const adGroups = rule.adGroups.map((value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) throw new Error(`${location}.adGroups must contain non-empty strings`);
      return value.trim().toLowerCase();
    });
    if (new Set(adGroups).size !== adGroups.length) throw new Error(`${location}.adGroups contains duplicates`);
    if (typeof rule.measureGroup !== 'string' || !rule.measureGroup.trim()) throw new Error(`${location}.measureGroup is required`);
    if (rule.decides !== undefined && typeof rule.decides !== 'boolean') throw new Error(`${location}.decides must be a boolean`);
    return { roleName, adGroups, measureGroup: rule.measureGroup.trim(), decides: rule.decides === true };
  });
}

/** Draken owns its registration choices. Metadata owns type group membership, identities and display names. */
export function resolveSupportMeasureRegistration(
  metadata: Pick<MetadataResponse, 'roles' | 'measureTypes'>,
  userGroups: readonly string[],
  configured: string | undefined,
): ResolvedMeasureRegistration {
  if (!configured?.trim()) return { creationRoles: [], registration: { status: 'unconfigured', roleTypes: [] } };
  try {
    const groups = new Set(userGroups.map(group => group.trim().toLowerCase()));
    const creationRoles: Role[] = [];
    const roleTypes: MeasureRegistrationPolicy['roleTypes'] = [];
    for (const rule of readRules(configured)) {
      const role = metadata.roles?.find(candidate => candidate.name === rule.roleName);
      if (!role) throw new Error(`${configurationName}: role ${rule.roleName} is missing from namespace metadata`);
      if (role.deprecated) continue;
      const types = (metadata.measureTypes ?? []).filter(
        type => !type.deprecated && Array.isArray(type.measureGroups) && type.measureGroups.includes(rule.measureGroup),
      );
      const measureTypeIds = types.map(type => {
        if (!type.id) throw new Error(`${configurationName}: type ${type.name} is missing its metadata ID`);
        return type.id;
      });
      roleTypes.push({ roleName: role.name, measureTypeIds, decides: rule.decides });
      if (rule.adGroups.some(group => groups.has(group))) creationRoles.push(role);
    }
    creationRoles.sort(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        (a.displayName || a.name).localeCompare(b.displayName || b.name, 'sv'),
    );
    return { creationRoles, registration: { status: 'ready', roleTypes } };
  } catch (cause) {
    // Configuration details stay in backend logs; reading existing measures remains available.
    logger.error(`${configurationName}: ${cause instanceof Error ? cause.message : 'Invalid configuration'}`);
    return { creationRoles: [], registration: { status: 'invalid', roleTypes: [] } };
  }
}

export function assertMeasureTypeForRole(policy: MeasureRegistrationPolicy, roleName: string | undefined, measureTypeId: string): void {
  if (policy.status !== 'ready')
    throw new HttpException(503, 'Åtgärdernas roll- och typval behöver konfigureras i Draken. Kontakta administratören.');
  if (!policy.roleTypes.some(rule => rule.roleName === roleName && rule.measureTypeIds.includes(measureTypeId))) {
    throw new HttpException(400, 'Åtgärdstypen är inte tillgänglig för registreringsrollen i Draken. Ladda om åtgärderna och välj igen.');
  }
}

export function assertMeasureRegistration(resolved: ResolvedMeasureRegistration, roleName: string, measureTypeId: string): void {
  if (resolved.registration.status !== 'ready')
    throw new HttpException(503, 'Åtgärdernas roll- och typval behöver konfigureras i Draken. Kontakta administratören.');
  if (!resolved.creationRoles.some(role => role.name === roleName)) throw new HttpException(403, 'Du saknar den valda registreringsrollen i Draken.');
  assertMeasureTypeForRole(resolved.registration, roleName, measureTypeId);
}

/** Whether measures registered in this role are accepted on creation rather than proposed. */
export function measureRoleDecides(policy: MeasureRegistrationPolicy, roleName: string): boolean {
  return policy.roleTypes.some(rule => rule.roleName === roleName && rule.decides);
}
