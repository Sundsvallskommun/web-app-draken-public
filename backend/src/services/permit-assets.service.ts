import { APPLICATION } from '@/config';

export interface PermitAssetType {
  type: string;
  displayName: string;
}

const ALCOHOL_AND_TOBACCO_PERMIT_TYPES: PermitAssetType[] = [
  { type: 'AlcoholServingPermit', displayName: 'Serveringstillstånd' },
  { type: 'TobaccoSalesPermit', displayName: 'Tobakstillstånd' },
  { type: 'LowAlcoholBeerSalesNotification', displayName: 'Anmälan om försäljning av folköl' },
  { type: 'LowAlcoholBeerServingNotification', displayName: 'Anmälan om servering av folköl' },
  { type: 'LowAlcoholBeerSalesAndServingNotification', displayName: 'Anmälan om försäljning och servering av folköl' },
  { type: 'ECigaretteSalesNotification', displayName: 'Anmälan om försäljning av e-cigaretter' },
  { type: 'TobaccoFreeNicotineProductSalesNotification', displayName: 'Anmälan om försäljning av tobaksfria nikotinprodukter' },
  { type: 'CateringOccasionNotification', displayName: 'Anmälan om catering' },
];

/**
 * The asset types each app's permit list (tillståndslista) may show, keyed by APPLICATION. An app that is not listed
 * gets none. The search filter is built from this list, not by the client, so it cannot reach other assets in
 * PartyAssets, such as persons' paratransit or parking permits.
 */
const PERMIT_ASSET_TYPES_BY_APPLICATION: Record<string, PermitAssetType[]> = {
  AOT: ALCOHOL_AND_TOBACCO_PERMIT_TYPES,
};

/** The permit asset types of this deployment's app. */
export const permitAssetTypes = (application: string | undefined = APPLICATION): PermitAssetType[] =>
  PERMIT_ASSET_TYPES_BY_APPLICATION[application ?? ''] ?? [];

export interface PermitAssetsQuery {
  term?: string;
  activeOnly?: boolean;
  /** Empty means all of `allowedTypes`. */
  types?: string[];
}

/** Strips what would break out of or widen a `~` pattern. */
const patternText = (text: string): string => text.replace(/['"*%\\]/g, '');

const typeClause = (type: string): string => `type:'${patternText(type)}'`;

const isNumberLike = (term: string): boolean => /^[\d\s-]+$/.test(term) && /\d/.test(term);

/** Stored as NNNNNN-NNNN. */
const storedOrganizationNumberPrefix = (term: string): string => {
  const digits = term.replace(/\D/g, '');
  return digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits;
};

/**
 * PartyAssets filters JSON parameters only as text, so each field is matched between its neighbouring keys in the
 * stored compact JSON. Relies on that key order; holders without an organisation number are not found by name.
 * `allowedTypes` must not be empty, and `types` must only hold allowed types; the caller checks both.
 */
export const permitAssetsFilter = ({ term = '', activeOnly = true, types = [] }: PermitAssetsQuery, allowedTypes: string[]): string => {
  const wanted = types.length > 0 ? types : allowedTypes;
  const typeFilter = `(${wanted.map(typeClause).join(' or ')})`;
  // PartyAssets' search returns drafts too, which are not issued permits.
  const base = `${typeFilter} and ${activeOnly ? "status:'ACTIVE'" : "status!'DRAFT'"}`;
  const text = patternText(term.trim());
  if (!text) {
    return base;
  }
  const clauses = [
    `jsonParameters.value ~ '*"permitHolder":{"name":"*${text}*","organizationNumber"*'`,
    `jsonParameters.value ~ '*"premises":{"name":"*${text}*","address"*'`,
    `jsonParameters.value ~ '*"pointOfSale":{"name":"*${text}*","address"*'`,
  ];
  if (isNumberLike(text)) {
    clauses.push(`jsonParameters.value ~ '*"organizationNumber":"${storedOrganizationNumberPrefix(text)}*'`);
  }
  return `${base} and (${clauses.join(' or ')})`;
};
