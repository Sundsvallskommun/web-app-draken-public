import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
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
