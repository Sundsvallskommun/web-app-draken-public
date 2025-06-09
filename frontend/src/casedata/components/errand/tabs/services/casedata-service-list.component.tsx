import { Service, ServiceListItem } from './casedata-service-item.component';

export const ServiceListComponent = ({
  services,
  onRemove,
  onOrder,
}: {
  services: Service[];
  onRemove: (id: number) => void;
  onOrder: (id: number) => void;
}) => {
  return (
    <div className="mt-32">
      {services.map((service) => (
        <ServiceListItem key={service.id} service={service} onRemove={onRemove} onOrder={onOrder} />
      ))}
    </div>
  );
};
