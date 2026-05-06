import { BillingServiceItem } from '@casedata/interfaces/billing';
import { casedataInvoiceSettings, CasedataService } from '@casedata/services/billing/casedata-invoice-settings';
import { calculateServiceTotal } from '@casedata/services/casedata-billing-service';
import { Button, FormControl, FormLabel, Input, Select } from '@sk-web-gui/react';
import { FC, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface AddBillingServiceProps {
  onSave: (service: BillingServiceItem) => void;
  onCancel: () => void;
  editingService?: BillingServiceItem;
}

const emptyFormState = {
  selectedServiceId: '',
  quantity: 1 as number | '',
  costPerUnit: 0 as number | '',
  costCenter: '',
  subaccount: '',
  department: '',
  activity: '',
  project: '',
  object: '',
  counterpart: '',
  beskrivning: '',
  descriptions: ['', '', ''] as string[],
};

export const AddBillingService: FC<AddBillingServiceProps> = ({ onSave, onCancel, editingService }) => {
  const [formState, setFormState] = useState(emptyFormState);
  const [selectedService, setSelectedService] = useState<CasedataService | null>(null);

  const isEditing = !!editingService;

  const isFieldPreset = (field: string): boolean => {
    if (selectedService) {
      const accountField = field as keyof typeof selectedService.accountInformation;
      if (['costCenter', 'subaccount', 'department', 'activity', 'project', 'object'].includes(field)) {
        if (selectedService.accountInformation[accountField]) return true;
      }
      if (field === 'beskrivning' && selectedService.description) return true;
      if (field === 'descriptions0' && selectedService.detailedDescriptions?.[0]) return true;
    }
    if (editingService) {
      const accountField = field as keyof typeof editingService.accountInformation;
      if (['costCenter', 'subaccount', 'department', 'activity', 'project', 'object'].includes(field)) {
        if (editingService.accountInformation[accountField]) return true;
      }
      if (field === 'beskrivning' && editingService.description) return true;
      if (field === 'descriptions0' && editingService.descriptions?.[0]) return true;
    }
    return false;
  };

  const resetForm = () => {
    setFormState(emptyFormState);
    setSelectedService(null);
  };

  useEffect(() => {
    if (editingService) {
      const service = casedataInvoiceSettings.services.find((s) => s.id === editingService.serviceId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedService(service || null);
      setFormState({
        selectedServiceId: editingService.serviceId,
        quantity: editingService.quantity,
        costPerUnit: editingService.costPerUnit,
        costCenter: editingService.accountInformation.costCenter || '',
        subaccount: editingService.accountInformation.subaccount || '',
        department: editingService.accountInformation.department || '',
        activity: editingService.accountInformation.activity || '',
        project: editingService.accountInformation.project || '',
        object: editingService.accountInformation.object || '',
        counterpart: editingService.accountInformation.counterpart || '',
        beskrivning: editingService.description || '',
        descriptions: [
          editingService.descriptions?.[0] || '',
          editingService.descriptions?.[1] || '',
          editingService.descriptions?.[2] || '',
        ],
      });
    } else {
      resetForm();
    }
  }, [editingService]);

  const handleServiceChange = (serviceId: string) => {
    const service = casedataInvoiceSettings.services.find((s) => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setFormState({
        ...formState,
        selectedServiceId: serviceId,
        costPerUnit: service.costPerUnit,
        costCenter: service.accountInformation.costCenter || '',
        subaccount: service.accountInformation.subaccount || '',
        department: service.accountInformation.department || '',
        activity: service.accountInformation.activity || '',
        project: service.accountInformation.project || '',
        counterpart: service.accountInformation.counterpart || '00000000',
        object: service.accountInformation.object || '',
        beskrivning: service.description || '',
        descriptions: [service.detailedDescriptions?.[0] || '', formState.descriptions[1], formState.descriptions[2]],
      });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const quantity = formState.quantity === '' ? 0 : formState.quantity;
    const costPerUnit = formState.costPerUnit === '' ? 0 : formState.costPerUnit;

    if (!selectedService || quantity <= 0) {
      return;
    }

    const totalAmount = calculateServiceTotal(quantity, costPerUnit);

    const serviceItem: BillingServiceItem = {
      id: editingService?.id || uuidv4(),
      serviceId: selectedService.id,
      name: selectedService.name,
      description: formState.beskrivning,
      quantity,
      costPerUnit,
      totalAmount,
      descriptions: formState.descriptions,
      accountInformation: {
        costCenter: formState.costCenter,
        subaccount: formState.subaccount,
        department: formState.department,
        activity: formState.activity,
        project: formState.project,
        counterpart: formState.counterpart,
        object: formState.object,
      },
    };

    onSave(serviceItem);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-16 bg-background-color-mixin-1 p-18">
      <div>
        <FormControl className="w-fit">
          <FormLabel>Tjänst</FormLabel>
          <Select
            className="w-fit"
            value={formState.selectedServiceId}
            onChange={(e) => handleServiceChange(e.target.value)}
          >
            <Select.Option value="">Välj tjänst</Select.Option>
            {casedataInvoiceSettings.services.map((service) => (
              <Select.Option key={service.id} value={service.id}>
                {service.name}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <div className="flex w-full justify-between">
            <FormLabel>Beskrivning</FormLabel>
            <span className="text-small text-dark-secondary">{formState.beskrivning.length}/30</span>
          </div>
          <Input
            maxLength={30}
            value={formState.beskrivning}
            onChange={(e) => handleInputChange('beskrivning', e.target.value)}
            readOnly={isFieldPreset('beskrivning')}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Antal</FormLabel>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={formState.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Pris</FormLabel>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={formState.costPerUnit}
            onChange={(e) => handleInputChange('costPerUnit', e.target.value === '' ? '' : parseFloat(e.target.value))}
            disabled={selectedService?.fixedPrice}
          />
        </FormControl>
      </div>
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Ansvar</FormLabel>
          <Input
            value={formState.costCenter}
            onChange={(e) => handleInputChange('costCenter', e.target.value)}
            readOnly={isFieldPreset('costCenter')}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Underkonto</FormLabel>
          <Input
            value={formState.subaccount}
            onChange={(e) => handleInputChange('subaccount', e.target.value)}
            readOnly={isFieldPreset('subaccount')}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Verksamhet</FormLabel>
          <Input
            value={formState.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            readOnly={isFieldPreset('department')}
          />
        </FormControl>
      </div>
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Aktivitet</FormLabel>
          <Input
            value={formState.activity}
            onChange={(e) => handleInputChange('activity', e.target.value)}
            readOnly={isFieldPreset('activity')}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Projekt</FormLabel>
          <Input
            value={formState.project}
            onChange={(e) => handleInputChange('project', e.target.value)}
            readOnly={isFieldPreset('project')}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Objekt</FormLabel>
          <Input
            value={formState.object}
            onChange={(e) => handleInputChange('object', e.target.value)}
            readOnly={isFieldPreset('object')}
          />
        </FormControl>
      </div>
      <div className="flex flex-col w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Utökad beskrivning</FormLabel>
          <div className="flex w-full justify-between">
            <FormLabel>Rad 1</FormLabel>
            <span className="text-small text-dark-secondary">{formState.descriptions[0].length}/51</span>
          </div>
          <Input
            maxLength={51}
            value={formState.descriptions[0]}
            onChange={(e) => {
              const updated = [...formState.descriptions];
              updated[0] = e.target.value;
              setFormState((prev) => ({ ...prev, descriptions: updated }));
            }}
            readOnly={isFieldPreset('descriptions0')}
          />
        </FormControl>
        <FormControl className="w-full">
          <div className="flex w-full justify-between">
            <FormLabel>Rad 2</FormLabel>
            <span className="text-small text-dark-secondary">{formState.descriptions[1].length}/51</span>
          </div>
          <Input
            maxLength={51}
            value={formState.descriptions[1]}
            onChange={(e) => {
              const updated = [...formState.descriptions];
              updated[1] = e.target.value;
              setFormState((prev) => ({ ...prev, descriptions: updated }));
            }}
          />
        </FormControl>
        <FormControl className="w-full">
          <div className="flex w-full justify-between">
            <FormLabel>Rad 3</FormLabel>
            <span className="text-small text-dark-secondary">{formState.descriptions[2].length}/51</span>
          </div>
          <Input
            maxLength={51}
            value={formState.descriptions[2]}
            onChange={(e) => {
              const updated = [...formState.descriptions];
              updated[2] = e.target.value;
              setFormState((prev) => ({ ...prev, descriptions: updated }));
            }}
          />
        </FormControl>
      </div>
      <div className="flex flex-row gap-16">
        <Button variant="secondary" onClick={handleCancel}>
          Avbryt
        </Button>
        <Button onClick={handleSave} disabled={!selectedService || !formState.quantity} color={'vattjom'}>
          {isEditing ? 'Spara' : 'Lägg till'}
        </Button>
      </div>
    </div>
  );
};
