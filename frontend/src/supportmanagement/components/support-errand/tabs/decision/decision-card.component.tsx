import { FC, ReactNode } from 'react';

/** One framed group of fields; the decision is read as a stack of them. */
export const DecisionCard: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="border-1 rounded-12 p-16">{children}</div>
);
