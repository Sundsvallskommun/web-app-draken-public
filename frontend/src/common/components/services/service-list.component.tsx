import { Service } from '@common/services/service-assets-service';

import { ServiceListItem } from './service-item.component';

type ServiceListComponentProps = {
  services?: Service[];
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
  emptyMessage?: string;
  currentErrandId?: string;
  sourceErrandLinkHref?: (service: Service) => string | undefined;
  removingId?: string | null;
};

export const ServiceListComponent = ({
  services,
  onRemove,
  onEdit,
  readOnly,
  emptyMessage = 'Inga insatser tillagda',
  currentErrandId,
  sourceErrandLinkHref,
  removingId,
}: ServiceListComponentProps) => {
  const list = services ?? [];
  return list.length === 0 ? (
    <div data-cy="no-services" className="mt-32">
      {emptyMessage}
    </div>
  ) : (
    <div data-cy="services-list" className="mt-32">
      {list.map((service) => (
        <ServiceListItem
          key={service.id}
          service={service}
          readOnly={readOnly}
          onRemove={readOnly ? undefined : onRemove}
          onEdit={readOnly ? undefined : onEdit}
          currentErrandId={currentErrandId}
          sourceErrandLinkHref={sourceErrandLinkHref}
          isRemoving={!readOnly && !!removingId && service.id === removingId}
        />
      ))}
    </div>
  );
};
