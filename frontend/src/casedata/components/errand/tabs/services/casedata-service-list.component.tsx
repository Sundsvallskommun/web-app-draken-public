import { Service, ServiceListItem } from './casedata-service-item.component';

export const ServiceListComponent = ({
  services,
  onRemove,
  onOrder,
  onEdit,
}: {
  services: Service[];
  onRemove: (id: string) => void;
  onOrder: (id: string) => void;
  onEdit: (service: Service) => void;
}) => {
  return (
    <div className="mt-32">
      {services.map((service) => (
        <ServiceListItem key={service.id} service={service} onRemove={onRemove} onOrder={onOrder} onEdit={onEdit} />
      ))}
    </div>
  );
};
