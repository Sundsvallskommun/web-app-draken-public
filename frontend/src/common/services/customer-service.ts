'use client';

import type { Assignment } from '@common/data-contracts/licensed-business/data-contracts';
import { Asset } from '@common/interfaces/asset';
import { getPartyServices } from '@common/services/asset-service';
import { CaseStatusResponse, getStatusesUsingOrganizationNumber } from '@common/services/casestatus-service';
import { getCompanyProfileByPartyId, getLegalEntityEngagements } from '@common/services/legal-entity-service';
import { appConfig } from '@config/appconfig';
import { withAssignments } from '@supportmanagement/services/licensed-business-service';
import {
  closedStatuses,
  getErrandParameterValue,
  getSupportErrandById,
  getSupportErrands,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { LegalEntityEngagement, LegalEntityProfile } from 'src/data-contracts/backend/data-contracts';

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

type PartyAssetValue = {
  // Alcohol assets have premises, tobacco assets pointOfSale.
  premises?: PartyAssetPlace;
  pointOfSale?: PartyAssetPlace;
  errandId?: string;
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

/** Assets as listed in the Tillstånd tab: decision data from the JSON, and the errand number looked up by the errand id. */
export const withSourceErrands = (municipalityId: string, assets: Asset[]): Promise<CustomerAsset[]> =>
  Promise.all(
    assets.map(async (asset) => {
      const value = (asset.jsonParameters?.[0]?.value ?? {}) as unknown as PartyAssetValue;
      const errandNumber =
        asset.sourceErrandNumber ??
        (value.errandId
          ? (await getSupportErrandById(value.errandId, municipalityId)).errand?.errandNumber
          : undefined);
      return {
        asset,
        registrationNumber: value.caseRegistrationNumber,
        caseOfficer: value.decision?.caseOfficer,
        decisionDate: value.decision?.decisionDate ?? asset.issued,
        errandNumber,
      };
    })
  );

interface CustomerPlaceAddress {
  street?: string;
  postalCode?: string;
  city?: string;
}

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
}

const placesFromAssets = (assets: Asset[]): CustomerPlace[] => {
  const places = new Map<string, CustomerPlace>();
  assets.forEach((asset) =>
    (asset.jsonParameters ?? []).forEach((parameter) => {
      const { premises, pointOfSale, decision } = (parameter.value ?? {}) as unknown as PartyAssetValue;
      const site = premises ?? pointOfSale;
      if (!site?.restaurantNumber && !site?.name) {
        return;
      }
      const key = site.restaurantNumber ?? `${site.name}|${site.address?.street ?? ''}`;
      const place = places.get(key) ?? {
        key,
        restaurantNumber: site.restaurantNumber,
        name: site.name,
        address: site.address,
        validFrom: decision?.validFrom,
        assetTypes: [],
        activeAssets: 0,
      };
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

const concernsPlace = (errand: SupportErrand, place: CustomerPlace): boolean =>
  place.restaurantNumber
    ? getErrandParameterValue(errand.parameters, 'restaurantNumber') === place.restaurantNumber
    : getErrandParameterValue(errand.parameters, 'premisesName') === place.name;

/** Errands found through the customer's id or through one of its places. */
export const getCustomerErrands = async (
  municipalityId: string,
  customerId: string,
  places: CustomerPlace[]
): Promise<SupportErrand[]> => {
  const search = async (query: string) => {
    const result = await getSupportErrands(municipalityId, 0, ERRAND_LOOKUP_SIZE, { query: encodeURIComponent(query) });
    if (result.error) {
      throw new Error(`Could not fetch errands: ${result.error}`);
    }
    return result.errands;
  };
  const [own, ...perPlace] = await Promise.all([
    search(customerId),
    ...places.map((place) => search(place.restaurantNumber ?? place.name ?? '')),
  ]);
  const errands = new Map((own ?? []).map((errand) => [errand.id, errand]));
  perPlace.forEach((found, index) =>
    found.filter((errand) => concernsPlace(errand, places[index])).forEach((errand) => errands.set(errand.id, errand))
  );
  return Array.from(errands.values());
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

export const countErrands = (errands: SupportErrand[]): { ongoing: number; closed: number } => {
  const closed = errands.filter(isClosed).length;
  return { ongoing: errands.length - closed, closed };
};

const isInspection = (errand: SupportErrand) =>
  !!errand.labels?.some((label) => label.resourcePath?.startsWith(INSPECTION_LABEL_PATH));

/** The most recently active closed inspection errand of the place. */
export const getLatestInspection = (errands: SupportErrand[], place: CustomerPlace): SupportErrand | undefined =>
  errands
    .filter((errand) => isInspection(errand) && isClosed(errand) && concernsPlace(errand, place))
    .sort((a, b) => (b.touched ?? '').localeCompare(a.touched ?? ''))[0];
