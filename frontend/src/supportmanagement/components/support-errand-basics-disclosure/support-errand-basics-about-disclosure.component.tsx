import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure } from '@sk-web-gui/react';
import React, { useEffect } from 'react';
import { SupportErrandBasicsAboutForm } from '../support-errand-basics-form/support-errand-basics-about-form.component';

export const SupportErrandBasicsAboutDisclosure: React.FC<{}> = () => {
  useEffect(() => {});
  return (
    <Disclosure variant="alt" header="Om ärendet" icon={<LucideIcon name="info" />} initalOpen={true}>
      <SupportErrandBasicsAboutForm />
    </Disclosure>
  );
};
