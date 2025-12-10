import { ContractType } from '@casedata/interfaces/contracts';
import { Badge, Link } from '@sk-web-gui/react';

export const ContractNavigation: React.FC<{ contractType: ContractType }> = ({ contractType }) => {
  const headers: { key: string; label: string }[] =
    contractType === ContractType.PURCHASE_AGREEMENT
      ? [
          { key: 'parties', label: 'Parter' },
          { key: 'area', label: 'Område' },
          { key: 'avtalstid', label: 'Avtalstid och uppsägning' },
          { key: 'lopande', label: 'Löpande avgift' },
          { key: 'engangs', label: 'Engångsfakturering' },
          { key: 'signerade', label: 'Signerade avtal' },
        ]
      : contractType === ContractType.LEASE_AGREEMENT
      ? [
          { key: 'parties', label: 'Parter' },
          { key: 'area', label: 'Område' },
          { key: 'avtalstid', label: 'Avtalstid och uppsägning' },
          { key: 'lopande', label: 'Löpande avgift' },
          { key: 'engangs', label: 'Engångsfakturering' },
          { key: 'signerade', label: 'Signerade avtal' },
        ]
      : [];
  return (
    <div className="w-1/4 pl-40 lg:visible invisible">
      <h2 className="text-h4-sm md:text-h4-md mb-md">Innehåll</h2>
      {headers.map((h) => (
        <div className="flex gap-12 items-center mb-7" data-cy={`badge-${h.key}`} key={`badge-${h.key}`}>
          <Badge
            id={`badge-${h.key}`}
            counter=""
            rounded
            className="!max-w-[10px] !min-w-[10px] !max-h-[10px] !min-h-[10px]"
            style={{ backgroundColor: 'lightgray' }}
          />
          <Link variant="tertiary">{h.label}</Link>
        </div>
      ))}
    </div>
  );
};
