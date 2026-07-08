'use client';

import { ServiceListItem } from '@common/components/services/service-item.component';
import { usePartyAssetServices } from '@common/hooks/use-asset-services';
import { assetTypeLabels } from '@common/interfaces/asset';
import { Service } from '@common/services/service-assets-service';
import { Button, Icon, Spinner } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { ArrowLeft, ChevronRight, FileCheck } from 'lucide-react';
import { FC, useState } from 'react';

interface CustomerViewServicesProps {
  partyId: string;
  assetTypes: string[];
}

const serviceTitle = (service: Service) =>
  (service.assetType && (assetTypeLabels as Record<string, string>)[service.assetType]) ||
  service.assetType ||
  'Insats';

export const CustomerViewServices: FC<CustomerViewServicesProps> = ({ partyId, assetTypes }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [selected, setSelected] = useState<Service>();
  const { partyServices, loading, error } = usePartyAssetServices({ municipalityId, partyId, assetTypes });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Spinner aria-label="Hämtar beslut och dokument" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-error py-24" role="alert">
        Beslut och dokument kunde inte hämtas
      </p>
    );
  }

  if (selected) {
    return (
      <div className="py-24" data-cy="customer-view-service-detail">
        <Button
          variant="link"
          className="text-body"
          leftIcon={<Icon icon={<ArrowLeft size={16} />} />}
          onClick={() => setSelected(undefined)}
          data-cy="customer-view-service-back"
        >
          Tillbaka till beslut och dokument
        </Button>
        <div className="mt-24">
          <ServiceListItem service={selected} readOnly />
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 flex flex-col gap-12" data-cy="customer-view-services">
      {partyServices.length === 0 ? (
        <p data-cy="customer-view-services-empty">Personen har inga beslut och dokument</p>
      ) : (
        partyServices.map((service) => (
          <button
            key={service.id}
            type="button"
            className="w-full flex items-center gap-16 p-16 rounded-cards border border-divider bg-background-content text-left hover:bg-vattjom-background-100"
            onClick={() => setSelected(service)}
            data-cy={`customer-view-service-${service.id}`}
          >
            <span className="p-12 bg-vattjom-background-300 rounded-lg flex items-center justify-center shrink-0">
              <FileCheck size={20} className="text-dark-secondary" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-bold text-dark-primary">{serviceTitle(service)}</span>
              {service.issued ? (
                <span className="block text-small text-dark-secondary">Senaste beslut: {service.issued}</span>
              ) : null}
            </span>
            <ChevronRight size={20} className="shrink-0 text-dark-secondary" />
          </button>
        ))
      )}
    </div>
  );
};
