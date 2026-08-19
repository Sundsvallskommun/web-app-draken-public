'use client';

import {
  resolveServiceTitle,
  ServiceListItem,
  serviceStatusColor,
} from '@common/components/services/service-item.component';
import { usePartyAssetServices } from '@common/hooks/use-asset-services';
import { assetStatusLabels, assetTypeLabels } from '@common/interfaces/asset';
import { Service } from '@common/services/service-assets-service';
import { Button, FormControl, FormLabel, Icon, Label, Select, Spinner } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { ArrowLeft, ChevronRight, FileCheck } from 'lucide-react';
import { FC, useState } from 'react';

interface CustomerViewServicesProps {
  partyId: string;
  assetTypes: string[];
}

// Typ- och statusetiketter delas med tjänstefliken via @common/interfaces/asset, så att samma
// insats heter samma sak oavsett var den visas.
const typeLabel = (assetType?: string) =>
  (assetType && (assetTypeLabels as Record<string, string>)[assetType]) || assetType || 'Insats';

const statusLabel = (status: string) => (assetStatusLabels as Record<string, string>)[status] ?? status;

const serviceTitle = (service: Service) => resolveServiceTitle(service) || typeLabel(service.assetType);

export const CustomerViewServices: FC<CustomerViewServicesProps> = ({ partyId, assetTypes }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [selected, setSelected] = useState<Service>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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

  const statusOptions = [...new Set(partyServices.map((s) => s.status).filter(Boolean))] as string[];
  const typeOptions = [...new Set(partyServices.map((s) => s.assetType).filter(Boolean))] as string[];
  const filtered = partyServices.filter(
    (s) => (statusFilter === 'all' || s.status === statusFilter) && (typeFilter === 'all' || s.assetType === typeFilter)
  );

  return (
    <div className="py-24" data-cy="customer-view-services">
      {partyServices.length === 0 ? (
        <p data-cy="customer-view-services-empty">Personen har inga beslut och dokument</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-16">
            <FormControl>
              <FormLabel>Typ</FormLabel>
              <Select
                size="md"
                className="w-[24rem]"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.currentTarget.value)}
                data-cy="customer-view-services-type-filter"
              >
                <Select.Option value="all">Alla typer</Select.Option>
                {typeOptions.map((type) => (
                  <Select.Option key={type} value={type}>
                    {typeLabel(type)}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                size="md"
                className="w-[20rem]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.currentTarget.value)}
                data-cy="customer-view-services-status-filter"
              >
                <Select.Option value="all">Alla statusar</Select.Option>
                {statusOptions.map((status) => (
                  <Select.Option key={status} value={status}>
                    {statusLabel(status)}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
          </div>
          <p className="mt-24 mb-8 text-small" data-cy="customer-view-services-count">
            Visar {filtered.length} av {partyServices.length} beslut och dokument
          </p>
          <div className="flex flex-col gap-12">
            {filtered.length === 0 ? (
              <p data-cy="customer-view-services-filtered-empty">Inga beslut och dokument matchar filtret</p>
            ) : (
              filtered.map((service) => (
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
                  {service.status ? (
                    <Label rounded inverted color={serviceStatusColor(service.status)} className="shrink-0">
                      {statusLabel(service.status)}
                    </Label>
                  ) : null}
                  <ChevronRight size={20} className="shrink-0 text-dark-secondary" />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
