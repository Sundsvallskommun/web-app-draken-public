'use client';

import { IErrand } from '@casedata/interfaces/errand';
import { Modal } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { CasedataServiceForm } from './casedata-service-form.component';
import { Service } from './casedata-service-item.component';
import { ServiceListComponent } from './casedata-service-list.component';

export const CasedataServicesTab: React.FC = () => {
  const { control, getValues } = useFormContext<IErrand>();

  const {
    fields: services,
    append,
    update,
    remove,
  } = useFieldArray<IErrand, 'services', 'fieldId'>({
    control,
    name: 'services',
    keyName: 'fieldId',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [serviceBeingEdited, setServiceBeingEdited] = useState<Service | null>(null);

  const handleAddService = (service: Service) => {
    append({ ...service });
  };

  const handleEditService = (updated: Service) => {
    const index = (services as Array<Service & { fieldId: string }>).findIndex((s) => s.id === updated.id);
    if (index !== -1) {
      update(index, updated);
    }
    setModalOpen(false);
  };

  const handleRemoveService = (id: string | number) => {
    const index = (services as Array<Service & { fieldId: string }>).findIndex((s) => s.id === id);
    if (index !== -1) {
      remove(index);
    }
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
          errand={getValues()}
          append={append}
          services={services}
          onRemove={handleRemoveService}
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
