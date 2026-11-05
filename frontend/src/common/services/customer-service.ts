'use client';

import { Asset } from '@common/interfaces/asset';
import { getPartyServices } from '@common/services/asset-service';
import { getCompanyProfileByPartyId } from '@common/services/legal-entity-service';
import { appConfig } from '@config/appconfig';
import { withAssignments } from '@supportmanagement/services/licensed-business-service';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';

/**
 * A customer as shown in the customer view (kundbild).
 *
 * `customerId` is whatever identifier the URL carries. Today it is the organisation's partyId,
 * but it may become an organisation number or a serveringsställe id. Only this service knows how
 * to turn the id into customer information; the components just render what they get.
 */
export interface Customer {
  customerId: string;
  name: string;
  organizationNumber?: string;
  /** Company form, e.g. "Aktiebolag". */
  form?: string;
}

export const getCustomerByCustomerId = async (customerId: string): Promise<Customer> => {
  const profile = await getCompanyProfileByPartyId(customerId);
  return {
    customerId,
    name: profile.name ?? customerId,
    organizationNumber: profile.organizationNumber,
    form: profile.form,
  };
};

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

type PartyAssetValue = { premises?: { name?: string; restaurantNumber?: string } };

export interface CustomerPlace {
  restaurantNumber: string;
  name?: string;
}

const placesFromAssets = (assets: Asset[]): CustomerPlace[] => {
  const places = new Map<string, CustomerPlace>();
  assets
    .flatMap((asset) => asset.jsonParameters ?? [])
    .forEach((parameter) => {
      const premises = (parameter.value as unknown as PartyAssetValue)?.premises;
      if (premises?.restaurantNumber && !places.has(premises.restaurantNumber)) {
        places.set(premises.restaurantNumber, { restaurantNumber: premises.restaurantNumber, name: premises.name });
      }
    });
  return Array.from(places.values());
};

/**
 * The customer's places: restaurant numbers on its assets, named by the LicensedBusiness register or else the asset.
 * Only alcohol permits have a restaurant number; tobacco uses pointOfSale.
 */
export const getCustomerPlaces = async (municipalityId: string, customerId: string): Promise<CustomerPlace[]> => {
  const places = placesFromAssets(await getCustomerAssets(municipalityId, customerId));
  if (!appConfig.features.useLicensedBusiness) {
    return places;
  }
  const registered = await withAssignments(
    municipalityId,
    places.map(({ restaurantNumber }) => ({ number: restaurantNumber }))
  );
  return places.map((place, index) => ({
    ...place,
    name: registered[index]?.assignment?.premisesName || place.name,
  }));
};
