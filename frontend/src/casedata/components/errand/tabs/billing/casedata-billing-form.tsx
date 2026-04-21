import { BillingFormData, BillingServiceItem, emptyBillingFormData } from '@casedata/interfaces/billing';
import { Role } from '@casedata/interfaces/role';
import {
  getCasedataBillingRecordsForErrand,
  saveCasedataBillingRecord,
} from '@casedata/services/casedata-billing-service';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { getSSNFromPersonId } from '@casedata/services/casedata-stakeholder-service';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Divider, FormErrorMessage, useSnackbar } from '@sk-web-gui/react';
import { useCasedataStore, useConfigStore, useUserStore } from '@stores/index';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';
import * as yup from 'yup';

import { AddBillingService } from './add-billing-service.component';
import { BillingLeaseholder } from './billing-leaseholder.component';
import { BillingServiceTable } from './billing-service-table.component';
import { BillingSpecifications } from './billing-specifications.component';
import { BillingTable } from './billing-table.component';

const billingSchema = yup.object({
  specifications: yup.object({
    ourReference: yup.string().required('Vår referens måste anges'),
    customerReference: yup.string().required('Kundens referens måste anges'),
    avitext: yup.string().required('Avitext måste anges'),
    rejectionDate: yup.string().test('not-past', 'Aviseringsdatum kan inte vara i det förflutna', (value) => {
      if (!value) return true;
      const today = new Date().toISOString().split('T')[0];
      return value >= today;
    }),
    selectedFacilities: yup.array().of(yup.string()),
  }),
  services: yup.array().min(1, 'Lägg till minst en kontering'),
  recipient: yup
    .object({
      name: yup.string(),
      organizationName: yup.string(),
      personId: yup.string(),
      personalNumber: yup.mixed(),
      organizationNumber: yup.string(),
      address: yup.string().required('Fakturamottagare saknar gatuadress'),
      postalCode: yup.string().required('Fakturamottagare saknar postnummer'),
      city: yup.string().required('Fakturamottagare saknar ort'),
      role: yup.string(),
    })
    .test('has-id', 'Fakturamottagare saknar personnummer/organisationsnummer', (value) => {
      return !!(value?.organizationNumber || value?.personId);
    })
    .required('Välj en fakturamottagare'),
});

export const CaseDataBillingForm: React.FC = () => {
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const user = useUserStore((s) => s.user);
  const toastMessage = useSnackbar();

  const [billingRecords, setBillingRecords] = useState<CBillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const form = useForm<BillingFormData>({
    resolver: yupResolver(billingSchema) as any,
    mode: 'onSubmit',
    defaultValues: {
      ...emptyBillingFormData,
      specifications: {
        ...emptyBillingFormData.specifications,
        ourReference: user ? `${user.firstName} ${user.lastName}` : '',
      },
    },
  });

  const {
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const services = watch('services');

  const refreshErrand = useCallback(async () => {
    if (!municipalityId || !errand?.id) return;

    try {
      const { errand: updatedErrand } = await getErrand(municipalityId, errand.id.toString());
      if (updatedErrand) {
        setErrand(updatedErrand);
      }
    } catch (error) {
      console.error('Failed to refresh errand:', error);
    }
  }, [municipalityId, errand?.id, setErrand]);

  const fetchBillingRecords = useCallback(async () => {
    if (!municipalityId || !errand) return;

    try {
      const records = await getCasedataBillingRecordsForErrand(errand, municipalityId);
      setBillingRecords(records);
    } catch (error) {
      console.error('Failed to fetch billing records:', error);
    }
  }, [municipalityId, errand]);

  useEffect(() => {
    fetchBillingRecords();
  }, [fetchBillingRecords]);

  const handleStartAddNew = () => {
    setIsAddingNew(true);
    setEditingServiceId(null);
  };

  const handleStartEdit = (serviceId: string) => {
    setEditingServiceId(serviceId);
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setIsAddingNew(false);
    setEditingServiceId(null);
  };

  const handleAddService = (service: BillingServiceItem) => {
    const currentServices = form.getValues('services');
    setValue('services', [...currentServices, service]);
    setIsAddingNew(false);
  };

  const handleUpdateService = (service: BillingServiceItem) => {
    const currentServices = form.getValues('services');
    const updatedServices = currentServices.map((s) => (s.id === service.id ? service : s));
    setValue('services', updatedServices);
    setEditingServiceId(null);
  };

  const handleRemoveService = (serviceId: string) => {
    const currentServices = form.getValues('services');
    setValue(
      'services',
      currentServices.filter((s) => s.id !== serviceId)
    );
  };

  const onSubmit = async (data: BillingFormData) => {
    if (!errand || !data.recipient) return;

    setIsLoading(true);

    try {
      const resolvedRecipient = { ...data.recipient };
      if (!resolvedRecipient.organizationNumber && resolvedRecipient.personId) {
        try {
          resolvedRecipient.personalNumber = await getSSNFromPersonId(municipalityId, resolvedRecipient.personId);
        } catch (e) {
          console.error('Failed to fetch personalNumber:', e);
        }
      }

      await saveCasedataBillingRecord({ ...data, recipient: resolvedRecipient }, errand!, municipalityId);

      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Faktura skapad',
        status: 'success',
      });

      reset({
        ...emptyBillingFormData,
        specifications: {
          ...emptyBillingFormData.specifications,
          ourReference: `${user?.firstName} ${user?.lastName}`,
        },
      });

      await refreshErrand();
      await fetchBillingRecords();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Kunde inte skapa faktura',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBillingRecord = async () => {
    await refreshErrand();
    await fetchBillingRecords();
  };

  const handleUpdateBillingRecord = (updatedRecord: CBillingRecord) => {
    setBillingRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
  };

  const isEditingOrAdding = isAddingNew || editingServiceId !== null;

  if (!errand) return null;

  const hasStakeholders = (errand.stakeholders || []).filter((s) => !s.roles.includes(Role.ADMINISTRATOR)).length > 0;

  if (!hasStakeholders) {
    return (
      <div className="w-full py-24 px-32">
        <h2 className="text-h4-sm md:text-h4-md">Engångsfakturering</h2>
        <div className="flex flex-col mt-40">
          <span className="text-label-large">Ärendet saknar parter</span>
          <div className="flex flex-row">
            <span>Lägg till minst en ärendeägare eller intressent under&nbsp;</span>
            <span className="underline">Grunduppgifter</span>
            <span>&nbsp;för att kunna skapa en engångsfaktura.</span>
          </div>
        </div>
        {billingRecords.length > 0 && (
          <div className="flex flex-col pt-24">
            <h3 className="text-h3-md pb-6">Skapade fakturaunderlag</h3>
            <span className="pb-16">Aviserade fakturor kommer att visas i avtalsöversikten</span>
            <BillingTable
              errand={errand!}
              billingRecords={billingRecords}
              onDeleteRecord={handleDeleteBillingRecord}
              onUpdateRecord={handleUpdateBillingRecord}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="w-full py-24 px-32">
        <div className="flex">
          <div className="w-full flex flex-col gap-32">
            <h2 className="text-h4-sm md:text-h4-md">Engångsfakturering</h2>
            <Divider.Section>Fakturaspecifikationer</Divider.Section>
            <BillingLeaseholder onSelectRecipient={(r) => setValue('recipient', r)} />
            <div>
              <BillingSpecifications />
            </div>
            <div>
              <Divider.Section>Kontering</Divider.Section>
            </div>
            <div>
              <BillingServiceTable
                services={services}
                onRemoveService={handleRemoveService}
                onEditService={handleStartEdit}
                onSaveService={handleUpdateService}
                onCancelEdit={handleCancelEdit}
                editingServiceId={editingServiceId}
              />
              {isAddingNew ? (
                <AddBillingService onSave={handleAddService} onCancel={handleCancelEdit} />
              ) : (
                <Button
                  className="mt-16"
                  variant="secondary"
                  leftIcon={<Plus />}
                  onClick={handleStartAddNew}
                  disabled={isEditingOrAdding}
                >
                  Ny kontering
                </Button>
              )}
              {errors.services && <FormErrorMessage className="mt-8">{errors.services.message}</FormErrorMessage>}
            </div>
            <div>
              <Button onClick={form.handleSubmit(onSubmit)} loading={isLoading} disabled={isLoading} color={'vattjom'}>
                Skapa fakturaunderlag
              </Button>
            </div>
            <div className="flex flex-col pt-24">
              <h3 className="text-h3-md pb-6">Skapade fakturaunderlag</h3>
              <span className="pb-16">Aviserade fakturor kommer att visas i avtalsöversikten</span>
              <BillingTable
                errand={errand!}
                billingRecords={billingRecords}
                onDeleteRecord={handleDeleteBillingRecord}
                onUpdateRecord={handleUpdateBillingRecord}
              />
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};
