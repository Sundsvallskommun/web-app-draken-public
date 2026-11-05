import { CustomerPageClient } from '@common/components/customer-menu/customer-page-client';
import { CustomerSelect } from '@common/components/customer-menu/customer-select.component';

export default function KundbildPage() {
  return (
    <CustomerPageClient heading="Kundbild">
      <CustomerSelect />
    </CustomerPageClient>
  );
}
