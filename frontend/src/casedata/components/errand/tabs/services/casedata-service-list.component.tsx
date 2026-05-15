import { Service } from '@casedata/services/casedata-service-assets-service';

import { ServiceListItem } from './casedata-service-item.component';

type ServiceListComponentProps = {
  services?: Service[];
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
  emptyMessage?: string;
};

export const ServiceListComponent = ({
  services,
  onRemove,
  onEdit,
  readOnly,
  emptyMessage = 'Inga insatser tillagda',
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
        />
      ))}
    </div>
  );
};
