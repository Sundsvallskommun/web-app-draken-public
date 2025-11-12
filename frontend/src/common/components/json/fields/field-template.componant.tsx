import type { FieldTemplateProps } from '@rjsf/utils';
import { FormControl, FormLabel } from '@sk-web-gui/react';

export function FieldTemplate(props: FieldTemplateProps) {
  const { id, label, required, displayLabel, description, errors, help, children, uiSchema } = props;

  const hideLabel = uiSchema?.['ui:options']?.hideLabel;
  const hideDescription = uiSchema?.['ui:options']?.hideDescription;
  const className = uiSchema?.['ui:options']?.className;
  const isHiddenWidget = uiSchema?.['ui:widget'] === 'hidden';

  if (isHiddenWidget) {
    return <>{children}</>;
  }

  const formControlClassName = className ? `form-row ${className}` : 'form-row w-full';

  return (
    <FormControl className={formControlClassName}>
      {displayLabel && !hideLabel && (
        <FormLabel htmlFor={id}>
          {label}
          {required ? ' *' : ''}
        </FormLabel>
      )}

      {description && !hideDescription ? (
        <div id={`${id}-desc`} className="text-xs text-muted-foreground mb-1">
          {description}
        </div>
      ) : null}

      {children}

      {help}
    </FormControl>
  );
}
