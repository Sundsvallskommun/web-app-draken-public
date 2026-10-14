import { FC, ReactNode } from 'react';

export const InvestigationFact: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-4 min-w-0">
    <span className="text-small font-bold text-dark-secondary">{label}</span>
    {children}
  </div>
);
