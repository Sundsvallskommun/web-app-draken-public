'use client';

import { ServiceListComponent } from '@common/components/services/service-list.component';
import { Badge, Button, Disclosure } from '@sk-web-gui/react';
import { useServiceStore } from '@stores/index';
import { Eye, EyeOff } from 'lucide-react';
import { FC, ReactNode, useMemo, useState } from 'react';

export const KC_ASSET_TYPES = ['ParatransitPermitLocal', 'ParatransitPermitNational', 'PARKINGPERMIT'];
const FT_ASSET_TYPES = new Set(['ParatransitPermitLocal', 'ParatransitPermitNational']);
const PARKING_ASSET_TYPES = new Set(['PARKINGPERMIT']);
const ACTIVE_PARTY_STATUSES = new Set(['ACTIVE', 'TEMPORARY']);

const renderServicesPanel = (
  loading: boolean,
  error: string | null | undefined,
  loadingLabel: string,
  content: ReactNode
): ReactNode => {
  if (loading) return <div>{loadingLabel}</div>;
  if (error) return <div className="text-error">{error}</div>;
  return content;
};

export const SupportErrandServicesTab: FC = () => {
  const [showFinished, setShowFinished] = useState(false);

  const partyServices = useServiceStore((s) => s.partyServices);
  const loading = partyServices === undefined;
  const error = partyServices === null ? 'Det gick inte att hämta personens insatser' : null;

  const visibleServices = useMemo(
    () => (showFinished ? partyServices : partyServices.filter((s) => s.status && ACTIVE_PARTY_STATUSES.has(s.status))),
    [partyServices, showFinished]
  );

  const ftServices = useMemo(
    () => visibleServices.filter((s) => s.assetType && FT_ASSET_TYPES.has(s.assetType)),
    [visibleServices]
  );
  const parkingServices = useMemo(
    () => visibleServices.filter((s) => s.assetType && PARKING_ASSET_TYPES.has(s.assetType)),
    [visibleServices]
  );

  return (
    <div data-cy="services-tab" className="w-full max-w-full py-24 px-32 overflow-x-hidden">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">Personens insatser hos kommunen.</p>

      <div className="mt-32">
        {renderServicesPanel(
          loading,
          error,
          'Hämtar personens insatser…',
          <>
            <div className="mb-16 flex justify-end">
              <Button
                data-cy="show-finished-party-services"
                variant="tertiary"
                size="sm"
                leftIcon={showFinished ? <EyeOff /> : <Eye />}
                onClick={() => setShowFinished((v) => !v)}
              >
                {showFinished ? 'Dölj avslutade' : 'Visa avslutade'}
              </Button>
            </div>

            <Disclosure variant="alt" data-cy="ft-services-disclosure" initalOpen>
              <Disclosure.Header>
                <Disclosure.Title>
                  <span className="flex items-center gap-12">
                    <span>Färdtjänstinsatser</span>
                    <Badge rounded color="vattjom" inverted counter={ftServices.length} />
                  </span>
                </Disclosure.Title>
                <Disclosure.Button />
              </Disclosure.Header>
              <Disclosure.Content>
                <ServiceListComponent
                  services={ftServices}
                  readOnly
                  emptyMessage="Personen har inga färdtjänstinsatser"
                />
              </Disclosure.Content>
            </Disclosure>

            <div className="mt-16">
              <Disclosure variant="alt" data-cy="parking-services-disclosure" initalOpen>
                <Disclosure.Header>
                  <Disclosure.Title>
                    <span className="flex items-center gap-12">
                      <span>Parkeringstillstånd</span>
                      <Badge rounded color="vattjom" inverted counter={parkingServices.length} />
                    </span>
                  </Disclosure.Title>
                  <Disclosure.Button />
                </Disclosure.Header>
                <Disclosure.Content>
                  <ServiceListComponent
                    services={parkingServices}
                    readOnly
                    emptyMessage="Personen har inga parkeringstillstånd"
                  />
                </Disclosure.Content>
              </Disclosure>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
