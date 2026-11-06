import { CustomerErrands } from '@common/components/customer-menu/customer-errands.component';
import { CustomerPageClient } from '@common/components/customer-menu/customer-page-client';

export default function KundbildPage() {
  return (
    <CustomerPageClient heading="Kundbild">
      <CustomerErrands />
    </CustomerPageClient>
  );
}
