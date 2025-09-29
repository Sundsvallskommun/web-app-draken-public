import { SubmitButtonProps } from '@rjsf/utils';
import { Button } from '@sk-web-gui/react';

export function SubmitButtonFieldTemplate(props: SubmitButtonProps<any, any, any>) {
  return (
    <Button type="submit" variant="primary">
      Lägg till
    </Button>
  );
}
