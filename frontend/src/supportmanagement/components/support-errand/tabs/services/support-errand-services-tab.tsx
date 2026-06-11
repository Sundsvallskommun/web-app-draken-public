'use client';

import { ServiceListComponent } from '@common/components/services/service-list.component';
import { usePartyAssetServices } from '@common/hooks/use-asset-services';
import { Service } from '@common/services/service-assets-service';
import { Badge, Disclosure, Tabs } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { FC, ReactNode, useMemo } from 'react';

export const KC_ASSET_TYPES = ['ParatransitPermitLocal', 'ParatransitPermitNational', 'PARKINGPERMIT'];
const FT_ASSET_TYPES = new Set(['ParatransitPermitLocal', 'ParatransitPermitNational']);
const PARKING_ASSET_TYPES = new Set(['PARKINGPERMIT']);
export const ACTIVE_PARTY_STATUSES = new Set(['ACTIVE', 'TEMPORARY']);

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

export const SupportErrandServicesTab: FC<{ partyId: string }> = ({ partyId }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { partyServices, loading, error } = usePartyAssetServices({
    municipalityId,
    partyId,
    assetTypes: KC_ASSET_TYPES,
  });

  const ftServices = useMemo(
    () => partyServices.filter((s) => s.assetType && FT_ASSET_TYPES.has(s.assetType)),
    [partyServices]
  );
  const parkingServices = useMemo(
    () => partyServices.filter((s) => s.assetType && PARKING_ASSET_TYPES.has(s.assetType)),
    [partyServices]
  );

  const disclosures = ({ pts, fts, emptyLabel }: { pts: Service[]; fts: Service[]; emptyLabel: string }) => (
    <>
      <Disclosure variant="alt" data-cy="ft-services-disclosure" initalOpen>
        <Disclosure.Header>
          <Disclosure.Title>
            <span className="flex items-center gap-12">
              <span>Färdtjänstinsatser</span>
              <Badge rounded color="vattjom" inverted counter={fts.length} />
            </span>
          </Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <ServiceListComponent
            services={fts}
            readOnly
            emptyMessage={`Personen har inga ${emptyLabel} färdtjänstinsatser`}
          />
        </Disclosure.Content>
      </Disclosure>

      <div className="mt-16">
        <Disclosure variant="alt" data-cy="parking-services-disclosure" initalOpen>
          <Disclosure.Header>
            <Disclosure.Title>
              <span className="flex items-center gap-12">
                <span>Parkeringstillstånd</span>
                <Badge rounded color="vattjom" inverted counter={pts.length} />
              </span>
            </Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <ServiceListComponent
              services={pts}
              readOnly
              emptyMessage={`Personen har inga ${emptyLabel} parkeringstillstånd`}
            />
          </Disclosure.Content>
        </Disclosure>
      </div>
    </>
  );

  return (
    <div data-cy="services-tab" className="w-full max-w-full py-24 px-32 overflow-x-hidden">
      <h2 className="text-h4-sm md:text-h4-md">Beslut och dokument</h2>
      <p className="mt-sm text-md">
        Här visas dokument, beslut och tillstånd. I den här versionen visas om invånaren har parkeringstillstånd och
        färdtjänstinsatser.
      </p>

      <div className="mt-32">
        {renderServicesPanel(
          loading,
          error,
          'Hämtar personens insatser…',
          <Tabs size={'sm'}>
            <Tabs.Item>
              <Tabs.Button>Aktiva</Tabs.Button>
              <Tabs.Content>
                {disclosures({
                  pts: parkingServices.filter((s) => s.status && ACTIVE_PARTY_STATUSES.has(s.status)),
                  fts: ftServices.filter((s) => s.status && ACTIVE_PARTY_STATUSES.has(s.status)),
                  emptyLabel: 'aktiva',
                })}
              </Tabs.Content>
            </Tabs.Item>
            <Tabs.Item>
              <Tabs.Button>Avslutade</Tabs.Button>
              <Tabs.Content>
                {disclosures({
                  pts: parkingServices.filter((s) => s.status && !ACTIVE_PARTY_STATUSES.has(s.status)),
                  fts: ftServices.filter((s) => s.status && !ACTIVE_PARTY_STATUSES.has(s.status)),
                  emptyLabel: 'avslutade',
                })}
              </Tabs.Content>
            </Tabs.Item>
          </Tabs>
        )}
      </div>
    </div>
  );
};
