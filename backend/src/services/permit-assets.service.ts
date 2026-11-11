/**
 * The asset types the permit list (tillståndslista) may search. The filter is built here, not by the client, so
 * the search cannot reach other assets in PartyAssets, such as persons' paratransit or parking permits.
 */
const PERMIT_ASSET_TYPES = [
  'AlcoholServingPermit',
  'TobaccoSalesPermit',
  'LowAlcoholBeerSalesNotification',
  'LowAlcoholBeerServingNotification',
  'LowAlcoholBeerSalesAndServingNotification',
  'ECigaretteSalesNotification',
  'TobaccoFreeNicotineProductSalesNotification',
  'CateringOccasionNotification',
];

export const isPermitAssetType = (type: string): boolean => PERMIT_ASSET_TYPES.includes(type);

export interface PermitAssetsQuery {
  term?: string;
  activeOnly?: boolean;
  /** Empty means all PERMIT_ASSET_TYPES. Must only hold PERMIT_ASSET_TYPES. */
  types?: string[];
}

/** Strips what would break out of or widen a `~` pattern. */
const patternText = (text: string): string => text.replace(/['"*%\\]/g, '');

const isNumberLike = (term: string): boolean => /^[\d\s-]+$/.test(term) && /\d/.test(term);

/** Stored as NNNNNN-NNNN. */
const storedOrganizationNumberPrefix = (term: string): string => {
  const digits = term.replace(/\D/g, '');
  return digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits;
};

/**
 * PartyAssets filters JSON parameters only as text, so each field is matched between its neighbouring keys in the
 * stored compact JSON. Relies on that key order; holders without an organisation number are not found by name.
 */
export const permitAssetsFilter = ({ term = '', activeOnly = true, types = [] }: PermitAssetsQuery = {}): string => {
  const wanted = types.length > 0 ? types : PERMIT_ASSET_TYPES;
  const typeFilter = `(${wanted.map(type => `type:'${patternText(type)}'`).join(' or ')})`;
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
