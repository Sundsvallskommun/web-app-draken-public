import { BillingServiceItem } from '@casedata/interfaces/billing';
import { casedataInvoiceSettings, CasedataService } from '@casedata/services/billing/casedata-invoice-settings';
import { calculateServiceTotal } from '@casedata/services/casedata-billing-service';
import { Button, FormControl, FormLabel, Input, Select, Textarea } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface AddBillingServiceProps {
  onSave: (service: BillingServiceItem) => void;
  onCancel: () => void;
  editingService?: BillingServiceItem;
}

const emptyFormState = {
  selectedServiceId: '',
  quantity: 1,
  costPerUnit: 0,
  costCenter: '',
  subaccount: '',
  department: '',
  activity: '',
  project: '',
  object: '',
  counterpart: '',
  avitext: '',
};

export const AddBillingService: React.FC<AddBillingServiceProps> = ({ onSave, onCancel, editingService }) => {
  const [formState, setFormState] = useState(emptyFormState);
  const [selectedService, setSelectedService] = useState<CasedataService | null>(null);

  const isEditing = !!editingService;

  useEffect(() => {
    if (editingService) {
      const service = casedataInvoiceSettings.services.find((s) => s.id === editingService.serviceId);
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
        avitext: editingService.avitext || '',
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
        counterpart: service.accountInformation.counterpart || casedataInvoiceSettings.counterpart || '',
        object: service.accountInformation.object || '',
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
    if (!selectedService || formState.quantity <= 0) {
      return;
    }

    const totalAmount = calculateServiceTotal(formState.quantity, formState.costPerUnit);

    const serviceItem: BillingServiceItem = {
      id: editingService?.id || uuidv4(),
      serviceId: selectedService.id,
      name: selectedService.name,
      description: selectedService.description,
      quantity: formState.quantity,
      costPerUnit: formState.costPerUnit,
      totalAmount,
      unit: selectedService.unit,
      avitext: formState.avitext,
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

  const resetForm = () => {
    setFormState(emptyFormState);
    setSelectedService(null);
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-16 bg-background-color-mixin-1 p-18">
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Tjänst</FormLabel>
          <Select
            className="w-full"
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
        <FormControl className="w-full">
          <FormLabel>Antal</FormLabel>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={formState.quantity}
            onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
          />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Pris</FormLabel>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={formState.costPerUnit}
            onChange={(e) => handleInputChange('costPerUnit', parseFloat(e.target.value) || 0)}
            disabled={selectedService?.fixedPrice}
          />
        </FormControl>
      </div>
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Kostnadsställe</FormLabel>
          <Input value={formState.costCenter} onChange={(e) => handleInputChange('costCenter', e.target.value)} />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Underkonto</FormLabel>
          <Input value={formState.subaccount} onChange={(e) => handleInputChange('subaccount', e.target.value)} />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Verksamhet</FormLabel>
          <Input value={formState.department} onChange={(e) => handleInputChange('department', e.target.value)} />
        </FormControl>
      </div>
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Aktivitet</FormLabel>
          <Input value={formState.activity} onChange={(e) => handleInputChange('activity', e.target.value)} />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Projekt</FormLabel>
          <Input value={formState.project} onChange={(e) => handleInputChange('project', e.target.value)} />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Objekt</FormLabel>
          <Input value={formState.object} onChange={(e) => handleInputChange('object', e.target.value)} />
        </FormControl>
      </div>
      <div className="w-full">
        <FormControl className="w-full">
          <FormLabel>Avitext</FormLabel>
          <Textarea
            className="w-full"
            rows={3}
            value={formState.avitext}
            onChange={(e) => handleInputChange('avitext', e.target.value)}
          />
        </FormControl>
      </div>
      <div className="flex flex-row gap-16">
        <Button variant="secondary" onClick={handleCancel}>
          Avbryt
        </Button>
        <Button onClick={handleSave} disabled={!selectedService || formState.quantity <= 0} color={'vattjom'}>
          {isEditing ? 'Spara' : 'Lägg till'}
        </Button>
      </div>
    </div>
  );
};
