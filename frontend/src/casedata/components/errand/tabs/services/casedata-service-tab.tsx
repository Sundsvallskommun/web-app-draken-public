import { useState } from 'react';
import { Modal } from '@sk-web-gui/react';
import { CasedataServiceForm } from './casedata-service-form.component';
import { ServiceListComponent } from './casedata-service-list.component';
import { Service } from './casedata-service-item.component';
import { v4 as uuidv4 } from 'uuid';

export const CasedataServicesTab: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [serviceBeingEdited, setServiceBeingEdited] = useState<Service | null>(null);

  const handleAddService = (service: Service) => {
    setServices((prev) => [...prev, { ...service, id: uuidv4() }]);
  };

  const handleEditService = (updated: Service) => {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setModalOpen(false);
  };

  const handleRemoveService = (id: number | string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="w-full py-24 px-32">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">
        Här specificeras vilka insatser som omfattas av färdtjänstbeslutet, samt eventuella tilläggstjänster och den
        service kunden har rätt till vid sina resor.
      </p>

      <div className="mt-24">
        <CasedataServiceForm onSubmit={handleAddService} onCancel={() => {}} />
      </div>

      <div className="mt-32 pt-24">
        <h4 className="text-h6 mb-sm border-b">Här listas de insatser som fattats kring ärendet</h4>
        <ServiceListComponent
          services={services}
          onRemove={handleRemoveService}
          onOrder={(id) => console.log('Beställ insats med id:', id)} //TODO: implement onOrder logic when ready.
          onEdit={(service) => {
            setServiceBeingEdited(service);
            setModalOpen(true);
          }}
        />
      </div>

      <Modal show={modalOpen} onClose={() => setModalOpen(false)}>
        <CasedataServiceForm
          key={serviceBeingEdited?.id ?? 'new'}
          initialService={serviceBeingEdited ?? undefined}
          onSubmit={handleEditService}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
};
