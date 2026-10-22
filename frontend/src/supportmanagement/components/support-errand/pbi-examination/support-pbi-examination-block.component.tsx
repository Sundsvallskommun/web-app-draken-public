import { FC } from 'react';

export const BlockIntro: FC<{ label: string; description: string }> = ({ label, description }) => (
  <p className="m-0">
    <span className="font-bold">{label}</span> - {description}
  </p>
);
