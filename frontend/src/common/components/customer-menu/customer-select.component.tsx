'use client';

import { appConfig } from '@config/appconfig';
import { Button } from '@sk-web-gui/react';
import NextLink from 'next/link';
import { FC } from 'react';

// TODO: Remove the test customer (appConfig.testCustomer + NEXT_PUBLIC_TEST_CUSTOMER_ID/_NAME) as soon as
// customers are fetched from the API. Temporary entry point until the microservice that lists
// serveringsställen/organisationer exists.
export const CustomerSelect: FC = () => {
  const testCustomer = appConfig.testCustomer;

  if (!testCustomer) {
    return (
      <p className="m-0" data-cy="customer-select-missing">
        Ingen testkund är konfigurerad (NEXT_PUBLIC_TEST_CUSTOMER_ID).
      </p>
    );
  }

  return (
    <div data-cy="customer-select">
      <NextLink href={`/kundbild/${testCustomer.customerId}`} passHref className="no-underline">
        <Button variant="primary" color="vattjom" data-cy="customer-select-test-customer">
          Välj {testCustomer.name}
        </Button>
      </NextLink>
    </div>
  );
};
