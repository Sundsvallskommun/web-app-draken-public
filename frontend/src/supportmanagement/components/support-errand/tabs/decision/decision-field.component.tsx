import { FormControl, FormHelperText, FormLabel } from '@sk-web-gui/react';
import { FC, ReactNode } from 'react';

/** A labelled field on the decision, with the help text the form shows under its label. */
export const DecisionField: FC<{
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
}> = ({ id, label, help, required, children }) => (
  <FormControl id={id} className="w-full" required={required}>
    <FormLabel>{label}</FormLabel>
    {help ? <FormHelperText className="p-0 m-0 text-small text-dark-secondary">{help}</FormHelperText> : null}
    {children}
  </FormControl>
);
