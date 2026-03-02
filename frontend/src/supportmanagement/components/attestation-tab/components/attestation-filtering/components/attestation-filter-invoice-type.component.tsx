import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';

export interface AttestationInvoiceTypeFilter {
  invoiceType: string[];
}

export const AttestationInvoiceTypeValues: AttestationInvoiceTypeFilter = {
  invoiceType: [],
};

export const AttestationFilterInvoiceTypeComponent: React.FC = () => {
  const { register, getValues } = useFormContext<AttestationInvoiceTypeFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<ChevronDown />}
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
          {invoiceSettings.invoiceTypes.map((invoiceType, index) => {
            return (
              <PopupMenu.Item key={`${invoiceType}-${index}`}>
                <Checkbox
                  labelPosition="left"
                  value={invoiceType.invoiceType}
                  {...register('invoiceType')}
                  data-cy={`attestationType-filter-${invoiceType}`}
                >
                  {invoiceType.invoiceType}
                </Checkbox>
              </PopupMenu.Item>
            );
          })}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
