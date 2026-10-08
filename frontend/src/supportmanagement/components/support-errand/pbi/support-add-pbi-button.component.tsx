import { Button } from '@sk-web-gui/react';
import { UserPlus } from 'lucide-react';
import { MouseEventHandler } from 'react';

interface AddPbiButtonProps {
  disabled: boolean | undefined;
  onClick: MouseEventHandler<HTMLButtonElement> | undefined;
  label: string;
}

export const AddPbiButton = ({ disabled, onClick, label }: AddPbiButtonProps) => {
  return (
    <div className="pt-16">
      <Button
        variant="secondary"
        size="sm"
        rightIcon={<UserPlus size={18} />}
        disabled={disabled}
        data-cy="suitability-pbi-add-open"
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
};
