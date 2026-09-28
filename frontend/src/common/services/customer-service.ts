'use client';

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
