import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { invoiceTypes } from '@supportmanagement/services/support-billing-service';
import { use } from 'chai';
import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

export interface AttestationInvoiceTypeFilter {
  invoiceType: string[];
}

export const AttestationInvoiceTypeValues = {
  invoiceType: [],
};

export const AttestationFilterInvoiceTypeComponent: React.FC = () => {
  const { register, getValues } = useFormContext<AttestationInvoiceTypeFilter>();

  useEffect(() => {
    console.log('getValues', getValues());
  }, [invoiceTypes]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="attestationInvoiceType-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Kostnadstyp
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <PopupMenu.Items autoFocus={false}>
          {invoiceTypes.map((invoiceType, index) => {
            return (
              <PopupMenu.Item key={`${invoiceType}-${index}`}>
                <Checkbox
                  labelPosition="left"
                  value={invoiceType.displayName}
                  {...register('invoiceType')}
                  data-cy={`attestationType-filter-${invoiceType}`}
                >
                  {invoiceType.displayName}
                </Checkbox>
              </PopupMenu.Item>
            );
          })}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
