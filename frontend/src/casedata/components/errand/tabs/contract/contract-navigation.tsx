import { ContractType } from '@casedata/services/contract-service';
import { Badge, Link } from '@sk-web-gui/react';

export const ContractNavigation: React.FC<{ contractType: ContractType }> = ({ contractType }) => {
  const headers: { key: string; label: string }[] =
    contractType === ContractType.PURCHASE_AGREEMENT
      ? [
          { key: 'parties', label: 'Parter' },
          { key: 'overlatelse', label: 'Överlåtelseförklaring' },
          { key: 'payment', label: 'Köpeskilling och betalning' },
          { key: 'access', label: 'Tillträde' },
          { key: 'pollution', label: 'Markföroreningar' },
          { key: 'forest', label: 'Skog' },
          { key: 'seller-obligations', label: 'Säljarens förpliktelser' },
          { key: 'expenses', label: 'Utgifter och kostnader' },
          { key: 'property', label: 'Fastighetsbildning' },
          { key: 'other', label: 'Övriga villkor' },
        ]
      : contractType === ContractType.LAND_LEASE
      ? [
          { key: 'parties', label: 'Parter' },
          { key: 'area', label: 'Område' },
          { key: 'purpose', label: 'Ändamål' },
          { key: 'arrendetid', label: 'Arrendetid och uppsägning' },
          { key: 'arrendeavgift', label: 'Arrendeavgift' },
          { key: 'bygglov', label: 'Bygglov och tillstånd' },
          { key: 'subletting', label: 'Överlåtelse och underupplåtelse' },
          { key: 'inskrivning', label: 'Inskrivning' },
          { key: 'skick', label: 'Skick och skötsel' },
          { key: 'ledningar', label: 'Ledningar' },
          { key: 'expenses', label: 'Kostnader' },
          { key: 'pollution', label: 'Markföroreningar' },
          { key: 'upphorande', label: 'Upphörande och återställning' },
          { key: 'damages', label: 'Skada och ansvar' },
          { key: 'special', label: 'Särskilda bestämmelser' },
          { key: 'jordabalk', label: 'Hänvisning till Jordabalken' },
        ]
      : [];
  return (
    <div className="w-1/5 pl-40 lg:visible invisible">
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
