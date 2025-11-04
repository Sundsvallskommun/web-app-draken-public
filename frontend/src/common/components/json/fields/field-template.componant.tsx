import type { FieldTemplateProps } from '@rjsf/utils';
import { FormControl, FormLabel } from '@sk-web-gui/react';

export function FieldTemplate(props: FieldTemplateProps) {
  const { id, label, required, displayLabel, description, errors, help, children, uiSchema } = props;

  const hideLabel = uiSchema?.['ui:options']?.hideLabel;
  const isHiddenWidget = uiSchema?.['ui:widget'] === 'hidden';
  if (isHiddenWidget) {
    return <>{children}</>;
  }

  return (
    <FormControl className="form-row pb-8 w-full">
      {displayLabel && !hideLabel && (
        <FormLabel htmlFor={id}>
          {label}
          {required ? ' *' : ''}
        </FormLabel>
      )}

      {description ? (
        <div id={`${id}-desc`} className="text-xs text-muted-foreground mb-1">
          {description}
        </div>
      ) : null}

      {children}

      {help}
    </FormControl>
  );
}
