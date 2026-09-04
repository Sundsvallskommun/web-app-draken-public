import { APPLICATION, CASEDATA_NAMESPACE, MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { FeatureFlagDto } from '@/dtos/featureflag.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';
import { FeatureFlag } from '@/responses/featureflag.response';

import ApiService from './api.service';

interface FeatureFlagServiceConfiguration {
  readonly adminpanelUrl?: string;
  readonly application?: string;
  readonly municipalityId?: string;
  readonly namespaces?: readonly (string | undefined)[];
  readonly freshTtlMs?: number;
  readonly staleTtlMs?: number;
  readonly now?: () => number;
}

interface FeatureFlagSnapshot {
  readonly flags: readonly FeatureFlag[];
  readonly fetchedAt: number;
}

interface ResolvedFeatureFlagConfiguration {
  readonly adminpanelUrl: string;
  readonly application: string;
  readonly municipalityId: string;
  readonly namespaces: ReadonlySet<string>;
  readonly freshTtlMs: number;
  readonly staleTtlMs: number;
  readonly now: () => number;
}

const DEFAULT_FRESH_TTL_MS = 30_000;
const DEFAULT_STALE_TTL_MS = 5 * 60_000;
const ADMINPANEL_TIMEOUT_MS = 3_000;

/** `{{INSERT_SOMETHING}}` as it is shipped in the example env files, left unsubstituted. */
const UNSUBSTITUTED_PLACEHOLDER = /^\{\{.*\}\}$/;

const requireConfiguration = (value: string | undefined, name: string): string => {
  if (!value?.trim()) {
    throw new HttpException(500, `Missing feature flag configuration: ${name}`);
  }
  return value.trim();
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readRequiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpException(502, `Adminpanel returned an invalid feature flag ${path}`);
  }
  return value;
};

const parseFeatureFlagResponse = (value: unknown): FeatureFlag[] => {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new HttpException(502, 'Adminpanel returned an invalid feature flag response');
  }

  return value.data.map((candidate, index) => {
    if (!isRecord(candidate) || !Number.isInteger(candidate.id) || typeof candidate.enabled !== 'boolean') {
      throw new HttpException(502, `Adminpanel returned an invalid feature flag at index ${index}`);
    }
    if (candidate.value !== undefined && candidate.value !== null && typeof candidate.value !== 'string') {
      throw new HttpException(502, `Adminpanel returned an invalid feature flag value at index ${index}`);
    }

    return Object.freeze({
      id: candidate.id as number,
      name: readRequiredString(candidate.name, `[${index}].name`),
      ...(!candidate.value ? {} : { value: candidate.value }),
      enabled: candidate.enabled,
      application: readRequiredString(candidate.application, `[${index}].application`),
      namespace: readRequiredString(candidate.namespace, `[${index}].namespace`),
    });
  });
};

const assertUniqueFlags = (flags: readonly FeatureFlag[]): void => {
  const identities = new Set<string>();
  for (const flag of flags) {
    const identity = `${flag.application}\u0000${flag.namespace}\u0000${flag.name}`;
    if (identities.has(identity)) {
      throw new HttpException(502, `Feature flag ${flag.namespace}/${flag.name} is configured more than once`);
    }
    identities.add(identity);
  }
};

/**
 * Canonical adapter for application-scoped Adminpanel feature flags.
 * Controllers and backend domain policies use the same filtered source so a
 * browser feature and its write protection cannot drift apart.
 */
export class FeatureFlagService {
  private readonly apiService: ApiService;
  private readonly configuration: FeatureFlagServiceConfiguration;
  private snapshot?: FeatureFlagSnapshot;
  private inFlight?: Promise<readonly FeatureFlag[]>;

  constructor(apiService = new ApiService(), configuration: FeatureFlagServiceConfiguration = {}) {
    this.apiService = apiService;
    this.configuration = configuration;
  }

  /**
   * Whether this deployment manages feature flags in Adminpanel at all. A deployment without an
   * Adminpanel URL is not a deployment whose flags are temporarily unreachable - it has no flag
   * source, and callers must decide from their own configuration rather than report an outage.
   *
   * An unsubstituted deploy placeholder counts as no URL. The example env files ship
   * `{{INSERT_ADMINPANEL_URL}}`, and sending requests to that is not an outage either.
   */
  isConfigured(): boolean {
    const adminpanelUrl = (this.configuration.adminpanelUrl ?? process.env.ADMINPANEL_URL)?.trim();

    return Boolean(adminpanelUrl) && !UNSUBSTITUTED_PLACEHOLDER.test(adminpanelUrl!);
  }

  private resolveConfiguration(): ResolvedFeatureFlagConfiguration {
    const adminpanelUrl = requireConfiguration(this.configuration.adminpanelUrl ?? process.env.ADMINPANEL_URL, 'ADMINPANEL_URL');
    const municipalityId = requireConfiguration(this.configuration.municipalityId ?? MUNICIPALITY_ID, 'MUNICIPALITY_ID');
    const application = requireConfiguration(this.configuration.application ?? APPLICATION, 'APPLICATION');
    const namespaces = new Set(
      (this.configuration.namespaces ?? [CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE]).filter((namespace): namespace is string =>
        Boolean(namespace?.trim()),
      ),
    );
    const now = this.configuration.now ?? Date.now;
    const freshTtlMs = this.configuration.freshTtlMs ?? DEFAULT_FRESH_TTL_MS;
    const staleTtlMs = this.configuration.staleTtlMs ?? DEFAULT_STALE_TTL_MS;

    return { adminpanelUrl, municipalityId, application, namespaces, now, freshTtlMs, staleTtlMs };
  }

  private getFreshSnapshot(configuration: ResolvedFeatureFlagConfiguration): readonly FeatureFlag[] | undefined {
    const snapshotAge = this.snapshot ? configuration.now() - this.snapshot.fetchedAt : Number.POSITIVE_INFINITY;
    return this.snapshot && snapshotAge <= configuration.freshTtlMs ? this.snapshot.flags : undefined;
  }

  private refreshApplicationFlags(user: User, configuration: ResolvedFeatureFlagConfiguration): Promise<readonly FeatureFlag[]> {
    if (this.inFlight) return this.inFlight;

    const { adminpanelUrl, municipalityId, application, namespaces, now } = configuration;
    this.inFlight = this.apiService
      .get<unknown>({ baseURL: `${adminpanelUrl}/featureflags/${municipalityId}`, timeout: ADMINPANEL_TIMEOUT_MS }, user)
      .then(result => {
        const flags = parseFeatureFlagResponse(result.data).filter(flag => flag.application === application && namespaces.has(flag.namespace));
        assertUniqueFlags(flags);
        const immutableFlags = Object.freeze([...flags]);
        this.snapshot = { flags: immutableFlags, fetchedAt: now() };
        return immutableFlags;
      })
      .finally(() => {
        this.inFlight = undefined;
      });

    return this.inFlight;
  }

  async getApplicationFlags(user: User): Promise<FeatureFlag[]> {
    const configuration = this.resolveConfiguration();
    const freshSnapshot = this.getFreshSnapshot(configuration);
    if (freshSnapshot) return [...freshSnapshot];

    try {
      return [...(await this.refreshApplicationFlags(user, configuration))];
    } catch (error) {
      const staleAge = this.snapshot ? configuration.now() - this.snapshot.fetchedAt : Number.POSITIVE_INFINITY;
      if (this.snapshot && staleAge <= configuration.staleTtlMs) return [...this.snapshot.flags];
      throw error;
    }
  }

  /**
   * Reads through the shared fresh cache and refresh request, but never falls
   * back to stale data. Security-sensitive policies should use this path.
   */
  async getFreshApplicationFlags(user: User): Promise<FeatureFlag[]> {
    const configuration = this.resolveConfiguration();
    const freshSnapshot = this.getFreshSnapshot(configuration);
    if (freshSnapshot) return [...freshSnapshot];

    return [...(await this.refreshApplicationFlags(user, configuration))];
  }

  async getFeatureFlags(user: User): Promise<FeatureFlagDto[]> {
    return (await this.getApplicationFlags(user)).map(flag => ({
      name: flag.name,
      value: flag.value,
      enabled: flag.enabled,
    }));
  }

  async getFeatureEnabled(user: User, name: string, namespace: string): Promise<boolean | undefined> {
    return (await this.getApplicationFlags(user)).find(flag => flag.namespace === namespace && flag.name === name)?.enabled;
  }

  async getFreshFeatureEnabled(user: User, name: string, namespace: string): Promise<boolean | undefined> {
    return (await this.getFreshApplicationFlags(user)).find(flag => flag.namespace === namespace && flag.name === name)?.enabled;
  }
}

export const featureFlagService = new FeatureFlagService();
