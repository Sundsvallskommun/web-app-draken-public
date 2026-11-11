'use client';

import type { Assignment } from '@common/data-contracts/licensed-business/data-contracts';
import { Asset } from '@common/interfaces/asset';
import { ApiResponse, apiService } from '@common/services/api-service';
import { getPartyServices, searchPermitAssets } from '@common/services/asset-service';
import { CaseStatusResponse, getStatusesUsingOrganizationNumber } from '@common/services/casestatus-service';
import { getCompanyProfileByPartyId, getLegalEntityEngagements } from '@common/services/legal-entity-service';
import { appConfig } from '@config/appconfig';
import { withAssignments } from '@supportmanagement/services/licensed-business-service';
import { jsonParameterForSchema, schemaNameForErrand } from '@supportmanagement/services/support-errand-schema-service';
import {
  closedStatuses,
  getSupportErrands,
  getSupportErrandsCount,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { inspectionProtocolDate } from '@supportmanagement/services/support-inspection-protocol-service';
import { getSupportInvestigation } from '@supportmanagement/services/support-investigation-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import {
  CLegalEntity2WithId,
  LegalEntityEngagement,
  LegalEntityProfile,
} from 'src/data-contracts/backend/data-contracts';

/**
 * A customer as shown in the customer view (kundbild).
 *
 * `customerId` is whatever identifier the URL carries. Today it is the organisation's partyId,
 * but it may become an organisation number or a serveringsställe id. Only this service knows how
 * to turn the id into customer information; the components just render what they get.
 */
const INSPECTION_LABEL_PATH = 'CATEGORYROOT/INSPECTION';

export interface Customer {
  customerId: string;
  name: string;
  organizationNumber?: string;
  /** Company form, e.g. "Aktiebolag". */
  form?: string;
  profile: LegalEntityProfile;
}

const toTitleCase = (text: string): string => text.toLowerCase().replace(/(^|\s)\S/g, (start) => start.toUpperCase());

export const nameFromAssetsOrErrands = (
  customerId: string,
  assets: Asset[],
  errands: SupportErrand[]
): string | undefined =>
  assets
    .filter((asset) => asset.partyId === customerId)
    .map((asset) => toPermitAsset(asset).permitHolder?.name)
    .find(Boolean) ??
  errands
    .flatMap((errand) => errand.stakeholders ?? [])
    .filter((stakeholder) => stakeholder.externalId === customerId)
    .map((stakeholder) => stakeholder.organizationName)
    .find(Boolean) ??
  undefined;

export const getCustomerByCustomerId = async (customerId: string): Promise<Customer> => {
  const companyProfile = await getCompanyProfileByPartyId(customerId);
  const form = companyProfile.form && toTitleCase(companyProfile.form);
  return {
    customerId,
    name: companyProfile.name ?? customerId,
    organizationNumber: companyProfile.organizationNumber,
    form,
    profile: { ...companyProfile, form },
  };
};

export const getCustomerEngagements = (customerId: string): Promise<LegalEntityEngagement[]> =>
  getLegalEntityEngagements(customerId);

export const getCustomerIdFromErrand = (errand: SupportErrand): string | undefined =>
  getSupportOwnerStakeholder(errand)?.externalId;

export const formatOrganizationNumber = (organizationNumber: string): string =>
  /^\d{10}$/.test(organizationNumber)
    ? `${organizationNumber.slice(0, 6)}-${organizationNumber.slice(6)}`
    : organizationNumber;

/**
 * PartyAssets type that represents an AOT tillstånd. Not decided yet, so no type filter is
 * applied and every asset on the customer is returned.
 * TODO: Set when the AOT asset type is decided.
 */
const CUSTOMER_ASSET_TYPE: string | undefined = undefined;

/**
 * Assets (tillstånd) for a customer. The id is resolved the same way as in
 * getCustomerByCustomerId: today it is used directly as the PartyAssets partyId.
 * Uses party-services so unissued DRAFT assets are excluded by the BFF.
 */
export const getCustomerAssets = async (
  municipalityId: string,
  customerId: string,
  type: string | undefined = CUSTOMER_ASSET_TYPE
): Promise<Asset[]> => {
  const res = await getPartyServices({ municipalityId, partyId: customerId, type });
  return res?.data ?? [];
};

type PartyAssetPlace = { name?: string; address?: CustomerPlaceAddress; restaurantNumber?: string };

interface PermitHolder {
  name?: string;
  organizationNumber?: string;
  address?: CustomerPlaceAddress;
  phoneNumber?: string;
}

export type PartyAssetValue = {
  permitHolder?: PermitHolder;
  // Alcohol assets have premises, tobacco assets pointOfSale.
  premises?: PartyAssetPlace;
  pointOfSale?: PartyAssetPlace;
  caseRegistrationNumber?: string;
  decision?: { validFrom?: string; decisionDate?: string; caseOfficer?: string };
};

export interface CustomerAsset {
  asset: Asset;
  registrationNumber?: string;
  caseOfficer?: string;
  decisionDate?: string;
  /** The errand the asset came from. */
  errandNumber?: string;
}

/** Assets as listed in the Tillstånd tab: decision data from the JSON, the source errand as the BFF found it. */
export const toCustomerAssets = (assets: Asset[]): CustomerAsset[] =>
  assets.map((asset) => {
    const value = (asset.jsonParameters?.[0]?.value ?? {}) as unknown as PartyAssetValue;
    return {
      asset,
      registrationNumber: value.caseRegistrationNumber,
      caseOfficer: value.decision?.caseOfficer,
      decisionDate: value.decision?.decisionDate ?? asset.issued,
      errandNumber: asset.sourceErrandNumber,
    };
  });

interface CustomerPlaceAddress {
  street?: string;
  postalCode?: string;
  city?: string;
}

/** Display names in common.json under customer.list.permits.types. The BFF keeps the same list and accepts no others. */
export const PERMIT_ASSET_TYPES = [
  'AlcoholServingPermit',
  'TobaccoSalesPermit',
  'LowAlcoholBeerSalesNotification',
  'LowAlcoholBeerServingNotification',
  'LowAlcoholBeerSalesAndServingNotification',
  'ECigaretteSalesNotification',
  'TobaccoFreeNicotineProductSalesNotification',
  'CateringOccasionNotification',
];

export const PERMIT_ASSETS_PAGE_SIZE = 12;

export interface PermitAsset {
  asset: Asset;
  permitHolder?: PermitHolder;
  premises?: PartyAssetPlace;
  registrationNumber?: string;
  validFrom?: string;
}

export interface PermitAssetsPage {
  permits: PermitAsset[];
  totalPages: number;
}

const toPermitAsset = (asset: Asset): PermitAsset => {
  const value = (asset.jsonParameters?.[0]?.value ?? {}) as unknown as PartyAssetValue;
  return {
    asset,
    permitHolder: value.permitHolder,
    premises: value.premises ?? value.pointOfSale,
    registrationNumber: value.caseRegistrationNumber,
    validFrom: value.decision?.validFrom ?? asset.issued,
  };
};

export interface PermitAssetsQuery {
  term?: string;
  activeOnly?: boolean;
  /** Empty means all PERMIT_ASSET_TYPES. */
  types?: string[];
}

/** `page` is 0-based; PartyAssets' is 1-based. */
export const getPermitAssets = async (
  municipalityId: string,
  page: number,
  query: PermitAssetsQuery = {}
): Promise<PermitAssetsPage> => {
  const res = await searchPermitAssets({
    municipalityId,
    term: query.term?.trim() || undefined,
    activeOnly: query.activeOnly ?? true,
    types: query.types?.join(',') || undefined,
    page: page + 1,
    limit: PERMIT_ASSETS_PAGE_SIZE,
    sortDirection: 'ASC',
  });
  return { permits: (res.data.assets ?? []).map(toPermitAsset), totalPages: res.data._meta?.totalPages ?? 0 };
};

export const getCustomerIdByOrganizationNumber = async (organizationNumber: string): Promise<string | undefined> => {
  const res = await apiService.post<ApiResponse<CLegalEntity2WithId>, { orgNr: string }>('organization/', {
    orgNr: organizationNumber,
  });
  return res.data.data?.partyId || undefined;
};

export interface CustomerPlace {
  /** Identifies the place among the customer's: its restaurant number, else name and street. */
  key: string;
  restaurantNumber?: string;
  name?: string;
  address?: CustomerPlaceAddress;
  /** When the asset's permit took effect. */
  validFrom?: string;
  assetTypes: string[];
  activeAssets: number;
  /** The assets the place was found through. */
  assets: Asset[];
}

/** A place is its restaurant number, else its name and street; tobacco points of sale have no number. */
const placeKeyOf = (site: PartyAssetPlace | undefined): string | undefined =>
  site?.restaurantNumber ?? (site?.name ? `${site.name}|${site.address?.street ?? ''}` : undefined);

const placesFromAssets = (assets: Asset[]): CustomerPlace[] => {
  const places = new Map<string, CustomerPlace>();
  assets.forEach((asset) =>
    (asset.jsonParameters ?? []).forEach((parameter) => {
      const { premises, pointOfSale, decision } = (parameter.value ?? {}) as unknown as PartyAssetValue;
      const site = premises ?? pointOfSale;
      const key = placeKeyOf(site);
      if (!site || !key) {
        return;
      }
      const place = places.get(key) ?? {
        key,
        restaurantNumber: site.restaurantNumber,
        name: site.name,
        address: site.address,
        validFrom: decision?.validFrom,
        assetTypes: [],
        activeAssets: 0,
        assets: [],
      };
      if (!place.assets.includes(asset)) {
        place.assets.push(asset);
      }
      if (asset.type && !place.assetTypes.includes(asset.type)) {
        place.assetTypes.push(asset.type);
      }
      place.activeAssets += asset.status === 'ACTIVE' ? 1 : 0;
      places.set(key, place);
    })
  );
  return Array.from(places.values());
};

const coversAsset = (assignment: Assignment | null, validFrom: string | undefined): boolean =>
  !!assignment?.validFrom &&
  !!validFrom &&
  assignment.validFrom <= validFrom &&
  (!assignment.validTo || validFrom <= assignment.validTo);

/** The places on the customer's assets, named by the LicensedBusiness register where the place has a restaurant number. */
export const getCustomerPlaces = async (municipalityId: string, assets: Asset[]): Promise<CustomerPlace[]> => {
  const places = placesFromAssets(assets);
  if (!appConfig.features.useLicensedBusiness) {
    return places;
  }
  const numbered = places.flatMap(({ restaurantNumber }) => (restaurantNumber ? [{ number: restaurantNumber }] : []));
  const registered = await withAssignments(municipalityId, numbered);
  const assignments = new Map(numbered.map(({ number }, index) => [number, registered[index]?.assignment ?? null]));
  return places.map((place) => {
    const assignment = (place.restaurantNumber && assignments.get(place.restaurantNumber)) || null;
    return { ...place, name: (coversAsset(assignment, place.validFrom) && assignment?.premisesName) || place.name };
  });
};

const ERRAND_LOOKUP_SIZE = 100;

export const CUSTOMER_ERRANDS_PAGE_SIZE = 10;

/** A tillsyn errand names its place in the form of its errand type, as premises or pointOfSale. */
const concernsPlace = (errand: SupportErrand, place: CustomerPlace, namespace: string | undefined): boolean => {
  const form = (jsonParameterForSchema(errand, schemaNameForErrand(errand, namespace))?.value ?? {}) as PartyAssetValue;
  return placeKeyOf(form.premises ?? form.pointOfSale) === place.key;
};

const customerFilter = (customerId: string) => ({ query: encodeURIComponent(customerId) });

export interface CustomerErrandsPage {
  errands: SupportErrand[];
  totalPages: number;
}

/**
 * One page of the customer's errands, the most recently active first.
 * Support Management searches no JSON parameters, so a place cannot be searched for.
 */
export const getCustomerErrands = async (
  municipalityId: string,
  customerId: string,
  page: number
): Promise<CustomerErrandsPage> => {
  const result = await getSupportErrands(municipalityId, page, CUSTOMER_ERRANDS_PAGE_SIZE, customerFilter(customerId), {
    touched: 'desc',
  });
  if (result.error) {
    throw new Error(`Could not fetch errands: ${result.error}`);
  }
  return { errands: result.errands ?? [], totalPages: result.totalPages ?? 0 };
};

/** Counted by Support Management, so a customer with more errands than a page holds is counted in full. */
export const getCustomerErrandCounts = async (
  municipalityId: string,
  customerId: string
): Promise<{ ongoing: number; closed: number }> => {
  const [all, closed] = await Promise.all([
    getSupportErrandsCount(municipalityId, customerFilter(customerId)),
    getSupportErrandsCount(municipalityId, { ...customerFilter(customerId), status: closedStatuses.join(',') }),
  ]);
  // The count answers null when it fails.
  if (typeof all !== 'number' || typeof closed !== 'number') {
    throw new Error('Could not count errands');
  }
  return { ongoing: all - closed, closed };
};

export interface CustomerInspection {
  errand: SupportErrand;
  /** The date the protocol gives, YYYY-MM-DD; missing when the protocol has none. */
  date?: string;
}

/** The customer's closed inspection errands, every page of them (a customer has few), dated by their protocols. */
export const getCustomerInspections = async (
  municipalityId: string,
  customerId: string
): Promise<CustomerInspection[]> => {
  const filter = {
    ...customerFilter(customerId),
    labelCategory: INSPECTION_LABEL_PATH,
    status: closedStatuses.join(','),
  };
  const inspections: SupportErrand[] = [];
  for (let page = 0, pages = 1; page < pages; page++) {
    const result = await getSupportErrands(municipalityId, page, ERRAND_LOOKUP_SIZE, filter);
    if (result.error) {
      throw new Error(`Could not fetch inspections: ${result.error}`);
    }
    inspections.push(...(result.errands ?? []));
    pages = result.totalPages ?? 0;
  }
  return Promise.all(
    inspections.map(async (errand) => ({
      errand,
      date: inspectionProtocolDate(await getSupportInvestigation(errand.id!, municipalityId)),
    }))
  );
};

/** The organisation's errands according to Casestatus, which covers more than this Drake. */
export const getCustomerCaseStatuses = (
  municipalityId: string,
  organizationNumber: string | undefined
): Promise<CaseStatusResponse[]> =>
  organizationNumber ? getStatusesUsingOrganizationNumber(municipalityId, organizationNumber) : Promise.resolve([]);

/** Cases without a namespace come from systems outside the Drakar. */
export const isOtherDrakeCase = (status: CaseStatusResponse, ownNamespace: string): boolean =>
  !!status.namespace && status.namespace !== ownNamespace;

const isClosed = (errand: SupportErrand) => closedStatuses.includes(errand.status as Status);

const isInspection = (errand: SupportErrand) =>
  !!errand.labels?.some((label) => label.resourcePath?.startsWith(INSPECTION_LABEL_PATH));

/** The place's closed inspection with the latest protocol date; one without a date cannot be placed and is left out. */
export const getLatestInspection = (
  inspections: CustomerInspection[],
  place: CustomerPlace,
  namespace: string | undefined
): CustomerInspection | undefined =>
  inspections
    .filter(
      ({ errand, date }) =>
        !!date && isInspection(errand) && isClosed(errand) && concernsPlace(errand, place, namespace)
    )
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
