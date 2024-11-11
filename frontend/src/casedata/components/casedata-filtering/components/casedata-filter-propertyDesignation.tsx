import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Input, PopupMenu } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CasePropertyDesignationFilter {
  propertyDesignation: string;
}

export const CasePropertyDesignationValues = {
  propertyDesignation: '',
};

export const CasedataFilterPropertyDesignation: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const { setValue, watch } = useFormContext<CasePropertyDesignationFilter>();

  const [propertyDesignation, setPropertyDesignation] = useState<string>(watch('propertyDesignation'));

  const handleApply = () => {
    setValue('propertyDesignation', propertyDesignation);
    setOpen(false);
  };
  return (
    <PopupMenu type="dialog" open={open} onToggleOpen={setOpen}>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="Fastighetsbeteckning-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Fast.bet
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <Input
          value={propertyDesignation}
          onChange={(e) => setPropertyDesignation(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          data-cy="Fastighetsbeteckning-input"
        />
        <Button onClick={() => handleApply()}>Lägg till</Button>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
