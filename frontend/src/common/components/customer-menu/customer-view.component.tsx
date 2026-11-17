'use client';

import { CustomerTabs } from '@common/components/customer-menu/customer-tabs.component';
import { type CustomerLookup, useCustomerData } from '@common/components/customer-menu/use-customer-lookup';
import {
  Customer,
  CustomerPlace,
  formatOrganizationNumber,
  getCustomerByCustomerId,
  nameFromAssetsOrErrands,
} from '@common/services/customer-service';
import { Breadcrumb, Label, Spinner } from '@sk-web-gui/react';
import { Building2 } from 'lucide-react';
import NextLink from 'next/link';
import { FC, useEffect, useState } from 'react';

type LookupResult = { customerId: string; customer: Customer } | { customerId: string; error: true };

const CustomerBreadcrumb: FC<{ current: string }> = ({ current }) => (
  <Breadcrumb className="flex items-center gap-8" data-cy="customer-breadcrumb">
    <Breadcrumb.Item>
      <Breadcrumb.Link as={NextLink} href="/kundbild" className="flex items-center gap-4">
        <Building2 size={16} aria-hidden /> Kundbild
      </Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item currentPage>
      <Breadcrumb.Link currentPage className="font-bold">
        {current}
      </Breadcrumb.Link>
    </Breadcrumb.Item>
  </Breadcrumb>
);

const CustomerPlaces: FC<{ places: CustomerLookup<CustomerPlace[]> }> = ({ places }) => {
  const content = () => {
    if (places.status === 'loading') {
      return <Spinner size={2} aria-label="Hämtar ställen" />;
    }
    if (places.status === 'error') {
      return (
        <span className="text-error" role="alert" data-cy="customer-view-places-error">
          Ställen kunde inte hämtas.
        </span>
      );
    }
    if (places.data.length === 0) {
      return <span className="text-dark-secondary">Inga ställen att visa ännu.</span>;
    }
    return places.data.map(({ key, restaurantNumber, name }) => (
      <Label key={key} rounded inverted color="tertiary" data-cy="customer-view-place">
        {[name, restaurantNumber].filter(Boolean).join(' · ')}
      </Label>
    ));
  };

  return (
    <div className="flex flex-wrap items-center gap-8" data-cy="customer-view-places">
      <Building2 size={16} aria-hidden />
      <span className="font-bold">Ställen:</span>
      {content()}
    </div>
  );
};

export const CustomerView: FC<{ customerId: string }> = ({ customerId }) => {
  const [result, setResult] = useState<LookupResult | null>(null);
  const data = useCustomerData(customerId);

  useEffect(() => {
    let cancelled = false;
    getCustomerByCustomerId(customerId)
      .then((customer) => {
        if (!cancelled) {
          setResult({ customerId, customer });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ customerId, error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!result || result.customerId !== customerId) {
    return <Spinner size={4} aria-label="Hämtar kund" />;
  }

  if ('error' in result) {
    return (
      <p className="m-0" data-cy="customer-view-error">
        Kunde inte hämta kund med id {customerId}.
      </p>
    );
  }

  const { customer } = result;
  // Legal Entity lacks names for some customers, e.g. associations.
  const name =
    (!customer.profile.name &&
      nameFromAssetsOrErrands(
        customerId,
        data.assets.status === 'done' ? data.assets.data.map(({ asset }) => asset) : [],
        data.errands.status === 'done' ? data.errands.data.errands : []
      )) ||
    customer.name;
  const details = [customer.form, customer.organizationNumber && formatOrganizationNumber(customer.organizationNumber)]
    .filter((d): d is string => !!d)
    .join(' · ');

  return (
    <div className="flex flex-col gap-24" data-cy="customer-view">
      <CustomerBreadcrumb current={name} />

      <div className="flex flex-col gap-4">
        <h1 className="p-0 m-0" data-cy="customer-view-name">
          {name}
        </h1>
        {details && (
          <span className="text-small text-dark-secondary" data-cy="customer-view-details">
            {details}
          </span>
        )}
      </div>

      <CustomerPlaces places={data.places} />

      <CustomerTabs customer={customer} data={data} />
    </div>
  );
};
