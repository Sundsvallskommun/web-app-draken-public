import { Divider, Icon } from '@sk-web-gui/react';
import { FC, JSX } from 'react';

export const BlockIntro: FC<{
  label: string;
  description: string;
  icon?: JSX.Element;
}> = ({ label, description, icon }) => (
  <div>
    <Divider />
    <div className="mt-8">
      <div className="flex gap-8 items-center">
        {icon ? <Icon icon={icon} size={18} /> : null}
        <p className="font-bold">{label}</p>
      </div>
      <p className="text-small">{description}</p>
    </div>
  </div>
);
