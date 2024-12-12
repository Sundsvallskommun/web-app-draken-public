import { Admin } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, cx } from '@sk-web-gui/react';
import { AttestationInvoiceWrapperComponent } from '@supportmanagement/components/attestation-tab/attestation-invoice-wrapper.component';
import {
  AttestationDatesFilter,
  AttestationDatesValues,
  AttestationFilterDatesComponent,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-dates.component';
import {
  AttestationFilterStatusComponent,
  AttestationStatusFilter,
  AttestationStatusValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-status.component';
import { AttestationFilterTagsComponent } from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-tags.component';
import {
  AttestationFilterInvoiceTypeComponent,
  AttestationInvoiceTypeFilter,
  AttestationInvoiceTypeValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/components/attestation-filter-invoice-type.component';
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
  const [show, setShow] = useState<boolean>(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState<boolean>(false);

  const closeCreateInvoice = () => {
    setShowCreateInvoice(false);
  };

  return (
    <>
      <div className="flex flex-col w-full gap-24">
        <div className="w-full flex items-start md:items-center justify-between flex-col md:flex-row gap-12">
          <h1 className="p-0 m-0">Attestering</h1>

          <Button
            className="w-full md:w-auto"
            onClick={() => setShow(!show)}
            data-cy="show-filters-button"
            color="vattjom"
            variant={show ? 'tertiary' : 'primary'}
            inverted={!show}
            leftIcon={<LucideIcon name="list-filter" size="1.8rem" />}
          >
            {show ? 'Dölj filter' : 'Filter'}
          </Button>
        </div>

        <div className={cx(show ? 'visible' : 'hidden')}>
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

        {/* <div className="flex flex-col md:flex-row justify-between gap-16">
          <div className="flex gap-16">
            <Checkbox checked={ownerFilter} onChange={() => ownerFilterHandler(!ownerFilter)}>
              Mina ärenden
            </Checkbox>
            <AttestationFilterTagsComponent administrators={administrators} />
          </div>

          {user.permissions.canEditAttestations && (
            <Button className="justify-end" size="sm" onClick={() => setShowCreateInvoice(true)}>
              Skapa fakturaunderlag
            </Button>
          )}

          <AttestationInvoiceWrapperComponent
            show={showCreateInvoice}
            label={'Skapa fakturaunderlag'}
            closeHandler={closeCreateInvoice}
          >

            <></>
          </AttestationInvoiceWrapperComponent>
        </div> */}
      </div>
    </>
  );
};

export default AttestationsFilteringComponent;
