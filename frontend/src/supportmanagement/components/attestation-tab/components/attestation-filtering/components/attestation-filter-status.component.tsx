import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { billingrecordStatusToLabel } from '@supportmanagement/services/support-billing-service';
import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';

export interface AttestationStatusFilter {
  status: string[];
}

export const AttestationStatusValues = {
  status: [],
};

export const AttestationFilterStatusComponent: React.FC = () => {
  const { register } = useFormContext();
  const ss = useMemo(() => {
    return (
      Object.values(CBillingRecordStatusEnum).map((s) => ({
        label: billingrecordStatusToLabel(s),
        status: s,
      })) || []
    );
  }, [billingrecordStatusToLabel]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="Ärendetyp-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Status
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <PopupMenu.Items autoFocus={false}>
          {ss.map((status, index) => {
            return (
              <PopupMenu.Item key={`${status.status}-${index}`}>
                <Checkbox
                  labelPosition="left"
                  value={status.status}
                  {...register('status')}
                  data-cy={`attestation-status-filter-${status.status}`}
                >
                  {status.label}
                </Checkbox>
              </PopupMenu.Item>
            );
          })}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
