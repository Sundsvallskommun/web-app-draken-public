import { CustomerPageClient } from '@common/components/customer-menu/customer-page-client';
import { appConfig } from '@config/appconfig';
import { notFound } from 'next/navigation';

export default function KundbildPage() {
  if (!appConfig.features.useCustomerPages) {
    notFound();
  }

  return <CustomerPageClient heading="Kundbild" />;
}
