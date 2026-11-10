import dayjs from 'dayjs';
import { FC } from 'react';

export const asInvestigationDate = (value: string | undefined): string =>
  value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '-';

export const InvestigationMetaItem: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-small text-dark-secondary">{label}</span>
    <span>{value}</span>
  </div>
);
