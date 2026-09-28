'use client';

import { Asset } from '@common/interfaces/asset';
import { getPartyServices } from '@common/services/asset-service';
import { getCompanyProfileByPartyId } from '@common/services/legal-entity-service';

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
