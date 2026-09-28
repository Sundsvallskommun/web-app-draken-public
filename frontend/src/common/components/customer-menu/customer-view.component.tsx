'use client';

import { CustomerTabs } from '@common/components/customer-menu/customer-tabs.component';
import { Customer, formatOrganizationNumber, getCustomerByCustomerId } from '@common/services/customer-service';
import { Breadcrumb, Spinner } from '@sk-web-gui/react';
import { Building2 } from 'lucide-react';
import NextLink from 'next/link';
import { FC, useEffect, useState } from 'react';

type LookupResult = { customerId: string; customer: Customer } | { customerId: string; error: true };

const CustomerBreadcrumb: FC<{ current: string }> = ({ current }) => (
  <Breadcrumb className="flex items-center gap-8" data-cy="customer-breadcrumb">
    <Breadcrumb.Item>
      <Breadcrumb.Link as={NextLink} href="/kundbild" className="flex items-center gap-4">
        <Building2 size={16} aria-hidden /> Organisationer
      </Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item currentPage>
      <Breadcrumb.Link currentPage className="font-bold">
        {current}
      </Breadcrumb.Link>
    </Breadcrumb.Item>
  </Breadcrumb>
);

export const CustomerView: FC<{ customerId: string }> = ({ customerId }) => {
  const [result, setResult] = useState<LookupResult | null>(null);

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
  const details = [customer.form, customer.organizationNumber && formatOrganizationNumber(customer.organizationNumber)]
    .filter((d): d is string => !!d)
    .join(' · ');

  return (
    <div className="flex flex-col gap-24" data-cy="customer-view">
      <CustomerBreadcrumb current={customer.name} />

      <div className="flex flex-col gap-4">
        <h1 className="p-0 m-0" data-cy="customer-view-name">
          {customer.name}
        </h1>
        {details && (
          <span className="text-small text-dark-secondary" data-cy="customer-view-details">
            {details}
          </span>
        )}
      </div>

      {/* TODO: Fill with serveringsställen/försäljningsställen when the microservice exists. */}
      <div className="flex items-center gap-8" data-cy="customer-view-places">
        <Building2 size={16} aria-hidden />
        <span className="font-bold">Ställen:</span>
        <span className="text-dark-secondary">Inga ställen att visa ännu.</span>
      </div>

      <CustomerTabs />
    </div>
  );
};
