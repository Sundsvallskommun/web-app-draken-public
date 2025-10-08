import { FormControl, FormLabel, Input, Switch } from '@sk-web-gui/react';
import React from 'react';
import { useFormContext } from 'react-hook-form';

type InputProps = React.ComponentPropsWithoutRef<typeof Input.Component>;

interface EditResourceInputProps extends Omit<InputProps, 'ref' | 'key'> {
  label: string;
  property: string;
  index: number;
  required?: boolean;
}

export const EditResourceInput: React.FC<EditResourceInputProps> = ({ label, property, required, ...rest }) => {
  const { register, watch } = useFormContext();
  const data = watch(property);
  const type = typeof data;

  return type === 'object' ?
      <></>
    : <FormControl required={required}>
        {type === 'boolean' ?
          <Switch {...register(property)} color="gronsta">
            {label}
          </Switch>
        : <>
            <FormLabel>{label}</FormLabel>
            <Input type={type === 'number' ? 'number' : 'text'} {...register(property)} {...rest} disabled />
          </>
        }
      </FormControl>;
};
