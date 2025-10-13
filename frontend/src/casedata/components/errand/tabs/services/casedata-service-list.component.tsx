import { ServiceListItem } from './casedata-service-item.component';
import { Service } from './casedata-service-mapper';

type ServiceListComponentProps = {
  services?: Service[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
};

export const ServiceListComponent = ({ services, onRemove, readOnly }: ServiceListComponentProps) => {
  const list = services ?? [];
  return (
    <div className="mt-32">
      {list.map((service) => (
        <ServiceListItem
          key={service.id}
          service={service}
          readOnly={readOnly}
          onRemove={readOnly ? undefined : onRemove}
        />
      ))}
    </div>
  );
};
