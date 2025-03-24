import { isMEX, isPT } from '@common/services/application-service';
import { Admin } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, cx, Link } from '@sk-web-gui/react';
import {
  AttestationDatesFilter,
  AttestationDatesValues,
  AttestationFilterDatesComponent,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-dates.component';
import {
  AttestationFilterInvoiceTypeComponent,
  AttestationInvoiceTypeFilter,
  AttestationInvoiceTypeValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-invoice-type.component';
import {
  AttestationFilterStatusComponent,
  AttestationStatusFilter,
  AttestationStatusValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-status.component';
import { SupportManagementFilterQuery } from '@supportmanagement/components/supportmanagement-filtering/components/supportmanagement-filter-query.component';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { useState } from 'react';

export type AttestationFilter = AttestationInvoiceTypeFilter & AttestationStatusFilter & AttestationDatesFilter;
export const AttestationValues = {
  ...AttestationInvoiceTypeValues,
  ...AttestationStatusValues,
  ...AttestationDatesValues,
};

export const AttestationsFilteringComponent: React.FC<{
  ownerFilterHandler: (b: boolean) => void;
  ownerFilter?: boolean;
  administrators?: (SupportAdmin | Admin)[];
}> = ({ ownerFilterHandler = () => false, ownerFilter, administrators = [] }) => {
  const { user } = useAppContext();
  const [show, setShow] = useState<boolean>(true);
  const [showCreateInvoice, setShowCreateInvoice] = useState<boolean>(false);

  const closeCreateInvoice = () => {
    setShowCreateInvoice(false);
  };

  return (
    <>
      <div className="flex flex-col w-full gap-16 py-19">
        <div className="w-full flex items-start md:items-center justify-between md:flex-row gap-16">
          <div className="w-full">
            <SupportManagementFilterQuery />
          </div>
          <div className="flex gap-16">
            <Button
              className="w-full md:w-auto"
              onClick={() => setShow(!show)}
              data-cy="Show-filters-button"
              color="vattjom"
              variant={show ? 'tertiary' : 'primary'}
              inverted={show ? false : true}
              leftIcon={<LucideIcon name="list-filter" size="1.8rem" />}
            >
              {show ? 'Dölj filter' : `Visa filter `}
            </Button>
            <Link
              href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
              target="_blank"
              data-cy="register-new-errand-button"
            >
              <Button
                color={isMEX() || isPT() ? 'primary' : 'vattjom'}
                variant={isMEX() || isPT() ? 'tertiary' : 'primary'}
              >
                Nytt ärende
              </Button>
            </Link>
          </div>
        </div>

        <div className={cx(show ? 'visible' : 'hidden')}>
          <div className="flex gap-16 items-center">
            <div className="w-full flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
              <div className="relative max-md:w-full">
                <AttestationFilterInvoiceTypeComponent />
              </div>

              <div className="relative max-md:w-full">
                <AttestationFilterStatusComponent />
              </div>

              <div className="relative max-md:w-full">
                <AttestationFilterDatesComponent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttestationsFilteringComponent;
