'use client';

import { countErrands, Customer, CustomerPlace, getLatestInspection } from '@common/services/customer-service';
import { companyAddressLines, engagementRoles } from '@common/services/legal-entity-service';
import { Button, Label, Spinner, Table } from '@sk-web-gui/react';
import { SupportErrandBusinessDescriptionDrawer } from '@supportmanagement/components/support-errand/tabs/support-errand-business-description-drawer.component';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { formatAddress } from '@supportmanagement/services/support-premises-address-service';
import dayjs from 'dayjs';
import { CircleAlert, Store } from 'lucide-react';
import { FC, PropsWithChildren, ReactNode, useState } from 'react';

import type { CustomerData, CustomerLookup } from './use-customer-lookup';

const INSPECTION_MAX_AGE_MONTHS = 12;

const TOBACCO_ASSET_TYPE = /^(Tobacco|ECigarette|LowAlcoholBeer)/;

const placeKinds = (place: CustomerPlace): string[] =>
  Array.from(
    new Set(place.assetTypes.map((type) => (TOBACCO_ASSET_TYPE.test(type) ? 'Tobak, folköl och nikotin' : 'Alkohol')))
  );

const kindColor = (kind: string) => (kind === 'Alkohol' ? 'vattjom' : 'juniskar');

const placeTitle = (place: CustomerPlace) => place.name ?? place.restaurantNumber;

export const OverviewSection: FC<PropsWithChildren<{ title: string; dataCy: string }>> = ({
  title,
  dataCy,
  children,
}) => (
  <section className="flex flex-col gap-12" data-cy={dataCy}>
    <h2 className="text-h3-md m-0">{title}</h2>
    {children}
  </section>
);

const Card: FC<PropsWithChildren<{ className?: string; dataCy?: string }>> = ({ className, dataCy, children }) => (
  <div className={`rounded-cards border-1 border-divider p-16 ${className ?? ''}`} data-cy={dataCy}>
    {children}
  </div>
);

export const lookupContent = <T,>(lookup: CustomerLookup<T>, failure: string, render: (data: T) => ReactNode) => {
  if (lookup.status === 'loading') {
    return <Spinner size={3} aria-label="Hämtar uppgifter" />;
  }
  if (lookup.status === 'error') {
    return (
      <p className="m-0 text-error" role="alert">
        {failure}
      </p>
    );
  }
  return render(lookup.data);
};

const InspectionRow: FC<{ place: CustomerPlace; errands: SupportErrand[] }> = ({ place, errands }) => {
  const inspection = getLatestInspection(errands, place);
  const outdated =
    !!inspection && dayjs(inspection.touched).isBefore(dayjs().subtract(INSPECTION_MAX_AGE_MONTHS, 'month'));
  const flagged = !inspection || outdated;

  return (
    <Card
      className={`flex flex-wrap items-center justify-between gap-12 ${
        flagged ? 'bg-warning-background-100 border-warning-surface-primary' : ''
      }`}
      dataCy="customer-overview-inspection"
    >
      <div className="flex items-center gap-8">
        <Store size={16} aria-hidden />
        <div className="flex flex-col">
          <span className="font-bold">{placeTitle(place)}</span>
          <span className="text-small text-dark-secondary">{placeKinds(place).join(', ')}</span>
        </div>
      </div>
      <div className="flex items-center gap-12">
        <div className="flex flex-col text-right">
          <span className="text-small text-dark-secondary">Senaste tillsyn</span>
          <span className="font-bold">
            {inspection ? (
              <>
                {dayjs(inspection.touched).format('YYYY-MM-DD')}{' '}
                <span className="text-small font-normal" data-cy="customer-overview-inspection-todo">
                  TODO källa?
                </span>
              </>
            ) : (
              'Aldrig'
            )}
          </span>
        </div>
        {flagged && (
          <Label rounded color="warning" className="gap-4 whitespace-nowrap">
            <CircleAlert size={14} aria-hidden />
            {inspection ? `Äldre än ${INSPECTION_MAX_AGE_MONTHS} månader` : 'Ingen tillsyn gjord'}
          </Label>
        )}
      </div>
    </Card>
  );
};

const LabelledValue: FC<PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <div className="flex flex-col">
    <span className="text-small text-dark-secondary">{label}</span>
    <span className="font-bold">{children}</span>
  </div>
);

const PlaceCard: FC<{ place: CustomerPlace }> = ({ place }) => (
  <Card className="flex flex-col gap-12" dataCy="customer-overview-place">
    <div className="flex flex-wrap items-center justify-between gap-8">
      <div className="flex items-center gap-8">
        <Store size={16} aria-hidden />
        <span className="font-bold">{placeTitle(place)}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {placeKinds(place).map((kind) => (
          <Label key={kind} rounded inverted color={kindColor(kind)}>
            {kind}
          </Label>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-16 max-small-device-max:grid-cols-1">
      <LabelledValue label="Adress">
        {place.address
          ? formatAddress({
              streetAddress: place.address.street,
              postalCode: place.address.postalCode,
              postalArea: place.address.city,
            })
          : '–'}
      </LabelledValue>
      <LabelledValue label="Restaurangnr">{place.restaurantNumber ?? '–'}</LabelledValue>
      <LabelledValue label="Aktiva tillstånd">{place.activeAssets}</LabelledValue>
    </div>
  </Card>
);

const CompanyDetails: FC<{ customer: Customer }> = ({ customer }) => {
  const { profile } = customer;
  const [showsDescription, setShowsDescription] = useState(false);

  return (
    <Card className="grid grid-cols-3 gap-16 max-small-device-max:grid-cols-1 bg-background-200">
      <LabelledValue label="Bolagsform">{profile.form ?? '–'}</LabelledValue>
      <LabelledValue label="Adress">
        {companyAddressLines(profile).map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </LabelledValue>
      <div className="flex flex-col items-start gap-4">
        <LabelledValue label="Antal anställda">{profile.employeeSize?.name ?? '–'}</LabelledValue>
        <Button variant="link" onClick={() => setShowsDescription(true)} data-cy="customer-overview-show-description">
          Visa verksamhetsbeskrivning
        </Button>
      </div>
      <SupportErrandBusinessDescriptionDrawer
        show={showsDescription}
        profile={profile}
        onClose={() => setShowsDescription(false)}
      />
    </Card>
  );
};

const Engagements: FC<{ engagements: CustomerData['engagements'] }> = ({ engagements }) => {
  return lookupContent(engagements, 'Bolagsordning kunde inte hämtas.', (data) =>
    data.length === 0 ? (
      <p className="m-0 text-dark-secondary">Inga uppgifter att visa.</p>
    ) : (
      <Table dense background aria-label="Bolagsordning" data-cy="customer-overview-engagements">
        <Table.Header>
          <Table.HeaderColumn>Befattning</Table.HeaderColumn>
          <Table.HeaderColumn>Namn</Table.HeaderColumn>
          <Table.HeaderColumn>Identitet</Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {data.map((engagement) => (
            <Table.Row key={`${engagement.identity?.code}-${engagement.name}`}>
              <Table.Column>{engagementRoles(engagement)}</Table.Column>
              <Table.Column>{engagement.name}</Table.Column>
              <Table.Column>{engagement.identity?.code}</Table.Column>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    )
  );
};

const Counter: FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <Card className="flex flex-col gap-4" dataCy="customer-overview-counter">
    <span className="text-small">{label}</span>
    <span className="text-h3-md font-bold">{value}</span>
  </Card>
);

/** Översikt tab of the customer view. */
export const CustomerOverview: FC<{ customer: Customer; data: CustomerData }> = ({ customer, data }) => {
  const { places, errands, engagements } = data;
  const counts = errands.status === 'done' ? countErrands(errands.data) : undefined;
  const count = (value: number | undefined) => value ?? (errands.status === 'error' ? '–' : '…');

  return (
    <div className="flex flex-col gap-32" data-cy="customer-overview">
      <OverviewSection title="Tillsyn" dataCy="customer-overview-inspections">
        {lookupContent(places, 'Ställen kunde inte hämtas.', (data) =>
          data.length === 0 ? (
            <p className="m-0 text-dark-secondary">Inga ställen att visa.</p>
          ) : (
            lookupContent(errands, 'Tillsyner kunde inte hämtas.', (found) => (
              <>
                {data.map((place) => (
                  <InspectionRow key={place.key} place={place} errands={found} />
                ))}
                <p className="m-0 text-small text-dark-secondary">
                  Ställen där senaste tillsyn är äldre än {INSPECTION_MAX_AGE_MONTHS} månader, eller saknas helt, är
                  markerade.
                </p>
              </>
            ))
          )
        )}
      </OverviewSection>

      <OverviewSection title="Bolagsuppgifter" dataCy="customer-overview-company">
        <CompanyDetails customer={customer} />
      </OverviewSection>

      <OverviewSection title="Serveringsställe- och försäljningsställeuppgifter" dataCy="customer-overview-places">
        {lookupContent(places, 'Ställen kunde inte hämtas.', (data) =>
          data.length === 0 ? (
            <p className="m-0 text-dark-secondary">Inga ställen att visa.</p>
          ) : (
            data.map((place) => <PlaceCard key={place.key} place={place} />)
          )
        )}
      </OverviewSection>

      <div className="grid grid-cols-4 gap-16 max-small-device-max:grid-cols-2" data-cy="customer-overview-counters">
        <Counter label="Pågående i Draken" value={count(counts?.ongoing)} />
        <Counter label="Avslutade i Draken" value={count(counts?.closed)} />
        {/* TODO: External errands need a rule for what counts as ongoing and closed in other systems. */}
        <Counter label="Pågående externa" value="–" />
        <Counter label="Avslutade externa" value="–" />
      </div>

      <OverviewSection title="Bolagsordning" dataCy="customer-overview-articles">
        <Engagements engagements={engagements} />
      </OverviewSection>
    </div>
  );
};
