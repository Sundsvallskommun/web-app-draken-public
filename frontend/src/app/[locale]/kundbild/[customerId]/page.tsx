import { CustomerPageClient } from '@common/components/customer-menu/customer-page-client';
import { CustomerView } from '@common/components/customer-menu/customer-view.component';
import { appConfig } from '@config/appconfig';
import { notFound } from 'next/navigation';

interface KundbildCustomerPageProps {
  params: Promise<{ customerId: string; locale: string }>;
}

export default async function KundbildCustomerPage({ params }: Readonly<KundbildCustomerPageProps>) {
  if (!appConfig.features.useCustomerPages) {
    notFound();
  }

  const { customerId } = await params;
  return (
    <CustomerPageClient>
      <CustomerView customerId={customerId} />
    </CustomerPageClient>
  );
}
