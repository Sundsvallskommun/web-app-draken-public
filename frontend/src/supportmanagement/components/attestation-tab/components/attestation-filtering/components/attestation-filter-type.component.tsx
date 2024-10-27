import { Checkbox, LucideIcon as Icon, PopupMenu } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';
import React from 'react';

export interface AttestationTypeFilter {
  type: string[];
}

export const AttestationTypeValues = {
  type: [],
};

const attestationTypes = [
  {
    id: 1,
    displayName: 'Extra utbetalning - Systemet',
  },
  {
    id: 1,
    displayName: 'Extra utbetalning - Direktinsättning',
  },
];

export const AttestationFilterTypeComponent: React.FC = () => {
  const { register } = useFormContext<AttestationTypeFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<Icon name="chevron-down" />}
        data-cy="attestationType-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Kostnadstyp
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <PopupMenu.Items autoFocus={false}>
          {attestationTypes.map((type, index) => {
            return (
              <PopupMenu.Item key={`${type.displayName}-${index}`}>
                <Checkbox
                  labelPosition="left"
                  value={type.displayName}
                  {...register('type')}
                  data-cy={`attestationType-filter-${type.displayName}`}
                >
                  {type.displayName}
                </Checkbox>
              </PopupMenu.Item>
            );
          })}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
