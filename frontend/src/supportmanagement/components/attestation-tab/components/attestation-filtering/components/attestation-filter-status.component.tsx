import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { billingrecordStatusToLabel } from '@supportmanagement/services/support-billing-service';
import { ChevronDown } from 'lucide-react';
import { FC, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';

export interface AttestationStatusFilter {
  status: string[];
}

export const AttestationStatusValues: AttestationStatusFilter = {
  status: [],
};

export const AttestationFilterStatusComponent: FC = () => {
  const { register } = useFormContext();
  const statuses = useMemo(() => {
    return (
      Object.values(CBillingRecordStatusEnum).map((s) => ({
        label: billingrecordStatusToLabel(s),
        status: s,
      })) || []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingrecordStatusToLabel]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<ChevronDown />}
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
          {statuses.map((status, index) => {
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
