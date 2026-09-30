'use client';

import type { Assignment } from '@common/data-contracts/licensed-business/data-contracts';
import { Button, Icon, Label, SearchField, Spinner, Table } from '@sk-web-gui/react';
import type { RestaurantNumberWithAssignment } from '@supportmanagement/services/licensed-business-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { Store } from 'lucide-react';
import { FC, useState } from 'react';

import { usePremisesRestaurantNumbers } from './use-premises-restaurant-numbers';

const SOURCE_LABELS: Record<PremisesAddress['source'], string> = {
  FORM: 'besöksadress i ansökan',
  OWNER: 'ärendeägarens adress',
};

const NUMBER_STATUS: Record<string, { label: string; color: 'gronsta' | 'tertiary' }> = {
  ACTIVE: { label: 'Aktivt', color: 'gronsta' },
  AVAILABLE: { label: 'Ledigt', color: 'tertiary' },
};

// LicensedBusiness documents ACTIVE only; any other status is shown as sent.
const ASSIGNMENT_STATUS: Record<string, string> = { ACTIVE: 'Aktiv' };

const formatAddress = (address: { streetAddress?: string; postalCode?: string; postalArea?: string }) =>
  [address.streetAddress, [address.postalCode, address.postalArea].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

const formatPeriod = (validFrom?: string, validTo?: string) =>
  validFrom || validTo ? `${validFrom ?? ''} – ${validTo ?? 'tills vidare'}` : '-';

const AssignmentCell: FC<{ restaurantNumber: RestaurantNumberWithAssignment; index: number }> = ({
  restaurantNumber,
  index,
}) => {
  if (restaurantNumber.assignmentFailed) {
    return <span className="text-error">Kunde inte hämtas</span>;
  }
  const assignment: Assignment | null = restaurantNumber.assignment;
  if (!assignment) {
    return <span className="text-dark-secondary italic">Aldrig tilldelat</span>;
  }

  const holder = assignment.holderName ?? assignment.licenseHolder?.name;
  const orgNumber = assignment.licenseHolder?.orgNumber;
  const status = assignment.status ? ASSIGNMENT_STATUS[assignment.status] ?? assignment.status : undefined;

  return (
    <div className="flex flex-col" data-cy={`premises-assignment-${index}`}>
      <span>
        {holder ?? '-'}
        {orgNumber ? <span className="text-dark-secondary"> ({orgNumber})</span> : null}
      </span>
      <span className="text-small text-dark-secondary">
        {formatPeriod(assignment.validFrom, assignment.validTo)}
        {status ? ` · ${status}` : null}
      </span>
    </div>
  );
};

const RestaurantNumbersTable: FC<{ restaurantNumbers: RestaurantNumberWithAssignment[] }> = ({ restaurantNumbers }) => {
  if (restaurantNumbers.length === 0) {
    return (
      <p className="text-dark-secondary italic m-0" data-cy="premises-no-restaurant-numbers">
        Inga serveringsställen finns registrerade på adressen.
      </p>
    );
  }

  return (
    <Table dense scrollable data-cy="premises-restaurant-numbers">
      <Table.Header>
        <Table.HeaderColumn>Nummer</Table.HeaderColumn>
        <Table.HeaderColumn>Namn</Table.HeaderColumn>
        <Table.HeaderColumn>Status</Table.HeaderColumn>
        <Table.HeaderColumn>Senaste tilldelning</Table.HeaderColumn>
      </Table.Header>
      <Table.Body>
        {restaurantNumbers.map((restaurantNumber, index) => {
          const status = restaurantNumber.status ? NUMBER_STATUS[restaurantNumber.status] : undefined;
          return (
            <Table.Row key={restaurantNumber.id ?? restaurantNumber.number ?? index} data-cy={`premises-row-${index}`}>
              <Table.Column>{restaurantNumber.number ?? '-'}</Table.Column>
              <Table.Column>{restaurantNumber.premisesName || '-'}</Table.Column>
              <Table.Column>
                {status ? (
                  <Label rounded inverted color={status.color}>
                    {status.label}
                  </Label>
                ) : (
                  restaurantNumber.status ?? '-'
                )}
              </Table.Column>
              <Table.Column>
                <AssignmentCell restaurantNumber={restaurantNumber} index={index} />
              </Table.Column>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
};

interface PremisesSectionProps {
  municipalityId: string | undefined;
  /** The premises address the errand points at; without one the person searches for an address. */
  premises: PremisesAddress | undefined;
}

/**
 * Serveringsställen (restaurant numbers) registered at the premises address, read-only. Knows nothing
 * about the errand, so it can be placed wherever the premises address is known.
 */
export const PremisesSection: FC<PremisesSectionProps> = ({ municipalityId, premises }) => {
  const { loading, error, match, address, restaurantNumbers, selectAddress, search } = usePremisesRestaurantNumbers(
    municipalityId,
    premises
  );
  const [query, setQuery] = useState(premises?.street ?? '');
  // A new premises street replaces whatever was typed (adjusting state during render, not in an effect).
  const [queryStreet, setQueryStreet] = useState(premises?.street);
  if (premises?.street !== queryStreet) {
    setQueryStreet(premises?.street);
    setQuery(premises?.street ?? '');
  }

  const results = () => {
    if (loading) {
      return <Spinner size={2} aria-label="Hämtar serveringsställen" />;
    }
    if (error) {
      return (
        <span className="text-small text-error" role="alert">
          {error}
        </span>
      );
    }
    if (address) {
      return (
        <div className="flex flex-col gap-8">
          <span className="text-small" data-cy="premises-selected-address">
            Serveringsställen på <strong>{formatAddress(address)}</strong>
          </span>
          <RestaurantNumbersTable restaurantNumbers={restaurantNumbers} />
        </div>
      );
    }
    if (match?.match === 'SEARCH') {
      if (match.addresses.length === 0) {
        return (
          <p className="text-dark-secondary italic m-0" data-cy="premises-no-addresses">
            Inga adresser hittades för ”{match.query}”.
          </p>
        );
      }
      return (
        <div className="flex flex-col gap-8">
          <span className="text-small">Välj adress för att visa dess serveringsställen:</span>
          <ul className="flex flex-col gap-4 m-0 p-0 list-none" data-cy="premises-address-results">
            {match.addresses.map((result, index) => (
              <li key={result.id ?? index}>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  color="vattjom"
                  data-cy={`premises-address-${index}`}
                  onClick={() => selectAddress(result)}
                >
                  {formatAddress(result)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pt-12 pb-20 px-16 border-t-1 flex flex-col gap-12" data-cy="premises-section">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-8">
          <Icon icon={<Store size={18} />} />
          <span className="font-semibold">Serveringsställe</span>
        </div>
        <span className="text-small text-dark-secondary" data-cy="premises-address">
          {premises
            ? `Söker på ${SOURCE_LABELS[premises.source]}: ${formatAddress({
                streetAddress: premises.street,
                postalCode: premises.postalCode,
                postalArea: premises.city,
              })}`
            : 'Ärendet saknar besöksadress. Sök efter serveringsställets adress.'}
        </span>
      </div>
      <SearchField
        size="md"
        value={query}
        placeholder="Sök adress"
        data-cy="premises-search"
        onChange={(e) => setQuery(e.target.value)}
        // The section sits inside the errand's form; Enter searches and must not submit it.
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        onSearch={(value) => search(value)}
        onReset={() => setQuery('')}
      />
      {results()}
    </div>
  );
};
