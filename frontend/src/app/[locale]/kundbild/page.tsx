import { CustomerListTabs } from '@common/components/customer-menu/customer-list-tabs.component';
import { CustomerPageClient } from '@common/components/customer-menu/customer-page-client';

export default function KundbildPage() {
  return (
    <CustomerPageClient heading="Kundbild">
      <CustomerListTabs />
    </CustomerPageClient>
  );
}
