import { SubmitButtonProps } from '@rjsf/utils';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button } from '@sk-web-gui/react';

interface SubmitButtonOptions {
  label?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  color?: string;
  className?: string;
  leadingIcon?: boolean | string;
}

export function SubmitButtonFieldTemplate(props: SubmitButtonProps<any, any, any>) {
  const uiSchema = (props as any).uiSchema || {};
  const buttonOptions: SubmitButtonOptions = uiSchema['ui:options'] || {};

  const label = buttonOptions.label || 'Lägg till';
  const variant = buttonOptions.variant || 'primary';
  const className = buttonOptions.className || 'mt-[3.2rem]';
  const leadingIcon = buttonOptions.leadingIcon !== false;

  return (
    <div className={className}>
      <Button type="submit" variant={variant as any} leftIcon={leadingIcon ? <LucideIcon name="plus" /> : undefined}>
        {label}
      </Button>
    </div>
  );
}
