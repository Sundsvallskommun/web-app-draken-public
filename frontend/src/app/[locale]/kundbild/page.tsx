import { CustomerPageClient } from '@common/components/customer-menu/customer-page-client';
import { CustomerSelect } from '@common/components/customer-menu/customer-select.component';
import { appConfig } from '@config/appconfig';
import { notFound } from 'next/navigation';

export default function KundbildPage() {
  if (!appConfig.features.useCustomerPages) {
    notFound();
  }

  return (
    <CustomerPageClient heading="Kundbild">
      <CustomerSelect />
    </CustomerPageClient>
  );
}
