'use client';

import type { Address, Assignment } from '@common/data-contracts/licensed-business/data-contracts';
import { Button, Icon, Label, SearchField, Spinner, Table } from '@sk-web-gui/react';
import type { RestaurantNumberWithAssignment } from '@supportmanagement/services/licensed-business-service';
import {
  formatAddress,
  formatPremisesAddress,
  type PremisesAddress,
} from '@supportmanagement/services/support-premises-address-service';
import { Store } from 'lucide-react';
import { FC, useMemo, useState } from 'react';

import { usePremisesRestaurantNumbers } from './use-premises-restaurant-numbers';

const SOURCE_LABELS: Record<PremisesAddress['source'], string> = {
  FORM: 'Adress i ansökan',
  OWNER: 'Ärendeägarens adress',
};

const NUMBER_STATUS: Record<string, { label: string; color: 'gronsta' | 'tertiary' }> = {
  ACTIVE: { label: 'Aktivt', color: 'gronsta' },
  AVAILABLE: { label: 'Ledigt', color: 'tertiary' },
};

// LicensedBusiness documents only ACTIVE; ENDED is what the register returns once validTo has passed.
// A status not listed here is shown as sent, so a new one is visible rather than hidden.
const ASSIGNMENT_STATUS: Record<string, string> = { ACTIVE: 'Pågående', ENDED: 'Avslutad' };

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

// Street numbers compare as numbers, so Storgatan 2 comes before Storgatan 11.
const addressCollator = new Intl.Collator('sv', { numeric: true, sensitivity: 'base' });

const byStreetThenPostalCode = (a: Address, b: Address) =>
  addressCollator.compare(a.streetAddress ?? '', b.streetAddress ?? '') ||
  addressCollator.compare(a.postalCode ?? '', b.postalCode ?? '');

interface AddressResultsTableProps {
  query: string;
  addresses: Address[];
  totalRecords: number;
  selected?: Address;
  onSelect: (address: Address) => void;
}

const AddressResultsTable: FC<AddressResultsTableProps> = ({ query, addresses, totalRecords, selected, onSelect }) => {
  const sorted = useMemo(() => [...addresses].sort(byStreetThenPostalCode), [addresses]);

  if (addresses.length === 0) {
    return (
      <p className="text-dark-secondary italic m-0" data-cy="premises-no-addresses">
        Inga adresser hittades för ”{query}”.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <span className="text-small" data-cy="premises-address-count">
        {totalRecords > addresses.length
          ? `Visar ${addresses.length} av ${totalRecords} adresser för ”${query}”. Förfina sökningen för att se fler.`
          : `${addresses.length} ${
              addresses.length === 1 ? 'adress' : 'adresser'
            } för ”${query}”. Välj en för att se dess serveringsställen.`}
      </span>
      <div data-cy="premises-address-results">
        <Table dense>
          <Table.Header>
            <Table.HeaderColumn>Adress</Table.HeaderColumn>
            <Table.HeaderColumn>Postnummer</Table.HeaderColumn>
            <Table.HeaderColumn>Ort</Table.HeaderColumn>
            <Table.HeaderColumn>
              <span className="sr-only">Åtgärd</span>
            </Table.HeaderColumn>
          </Table.Header>
          <Table.Body>
            {sorted.map((result, index) => {
              const isSelected = !!selected?.id && selected.id === result.id;
              return (
                <Table.Row
                  key={result.id ?? index}
                  data-cy={`premises-address-${index}`}
                  aria-selected={isSelected}
                  className={isSelected ? 'bg-vattjom-background-100' : undefined}
                >
                  <Table.Column>{result.streetAddress}</Table.Column>
                  <Table.Column>{result.postalCode}</Table.Column>
                  <Table.Column>{result.postalArea ?? '-'}</Table.Column>
                  <Table.Column>
                    {isSelected ? (
                      <span className="text-small font-semibold">Vald</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="tertiary"
                        data-cy={`premises-address-select-${index}`}
                        aria-label={`Visa serveringsställen på ${formatAddress(result)}`}
                        onClick={() => onSelect(result)}
                      >
                        Visa
                      </Button>
                    )}
                  </Table.Column>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </div>
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

  const status = () => {
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
    return null;
  };

  const restaurantNumbersOfAddress = () =>
    address && !loading && !error ? (
      <div className="flex flex-col gap-8">
        <span className="text-small" data-cy="premises-selected-address">
          Serveringsställen på <strong>{formatAddress(address)}</strong>
        </span>
        <RestaurantNumbersTable restaurantNumbers={restaurantNumbers} />
      </div>
    ) : null;

  return (
    <div className="pt-12 pb-20 px-16 border-t-1 flex flex-col gap-12" data-cy="premises-section">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-8">
          <Icon icon={<Store size={18} />} />
          <span className="font-semibold">Serveringsställe</span>
        </div>
        <p className="text-small text-dark-secondary m-0" data-cy="premises-info">
          Visar bara vad som redan finns registrerat på adressen. En ny tilldelning, och vid behov ett nytt
          serveringsställenummer, skapas i beslutssteget.
        </p>
        <span className="text-small text-dark-secondary" data-cy="premises-address">
          {premises
            ? `${SOURCE_LABELS[premises.source]}: ${formatPremisesAddress(premises)}`
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
      {match?.match === 'SEARCH' ? (
        <AddressResultsTable
          query={match.query}
          addresses={match.addresses}
          totalRecords={match.totalRecords}
          selected={address}
          onSelect={selectAddress}
        />
      ) : null}
      {status()}
      {restaurantNumbersOfAddress()}
    </div>
  );
};
