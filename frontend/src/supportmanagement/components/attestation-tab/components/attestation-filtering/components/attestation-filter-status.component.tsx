import { LucideIcon as Icon, PopupMenu, Checkbox } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';
import React from 'react';

export interface AttestationStatusFilter {
  status: string[];
}

export const AttestationStatusValues = {
  status: [],
};

const attestationStatus = [
  {
    id: 1,
    status: 'APPROVED',
  },
  {
    id: 1,
    status: 'DENIED',
  },
  {
    id: 1,
    status: 'NONE',
  },
];

export const AttestationFilterStatusComponent: React.FC = () => {
  const { register } = useFormContext();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<Icon name="chevron-down" />}
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
          {attestationStatus.map((status, index) => {
            return (
              <PopupMenu.Item key={`${status.status}-${index}`}>
                <Checkbox
                  labelPosition="left"
                  value={status.status}
                  {...register('status')}
                  data-cy={`attestation-status-filter-${status.status}`}
                >
                  {status.status}
                </Checkbox>
              </PopupMenu.Item>
            );
          })}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
