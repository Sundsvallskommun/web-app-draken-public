import {
  BillingFormData,
  BillingRecipient,
  BillingServiceItem,
  emptyBillingFormData,
} from '@casedata/interfaces/billing';
import {
  getCasedataBillingRecordsForErrand,
  saveCasedataBillingRecord,
} from '@casedata/services/casedata-billing-service';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { getSSNFromPersonId } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@contexts/app.context';
import { Button, Divider, useSnackbar } from '@sk-web-gui/react';
import { Plus } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';

import { AddBillingService } from './add-billing-service.component';
import { BillingLeaseholder } from './billing-leaseholder.component';
import { BillingServiceTable } from './billing-service-table.component';
import { BillingSpecifications } from './billing-specifications.component';
import { BillingTable } from './billing-table.component';

export const CaseDataBillingForm: FC = () => {
  const { errand, municipalityId, user, setErrand } = useAppContext();
  const toastMessage = useSnackbar();

  const [billingRecords, setBillingRecords] = useState<CBillingRecord[]>([]);
  const [recipient, setRecipient] = useState<BillingRecipient | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const form = useForm<BillingFormData>({
    defaultValues: {
      ...emptyBillingFormData,
      specifications: {
        ...emptyBillingFormData.specifications,
        ourReference: user ? `${user.firstName} ${user.lastName}` : '',
      },
    },
  });

  const { reset, watch, setValue } = form;
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

  const onSubmit = async () => {
    const data = form.getValues();
    if (!errand) return;

    if (data.services.length === 0) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Lägg till minst en tjänst innan du skapar faktura',
        status: 'error',
      });
      return;
    }

    if (!data.specifications.customerReference) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Ange kundens referens',
        status: 'error',
      });
      return;
    }

    if (!data.specifications.avitext?.trim()) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Ange avitext för fakturan',
        status: 'error',
      });
      return;
    }

    if (!recipient) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Välj en fakturamottagare.',
        status: 'error',
      });
      return;
    }

    if (!recipient.organizationNumber && !recipient.personId) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Fakturamottagare saknar personnummer/organisationsnummer.',
        status: 'error',
      });
      return;
    }

    if (!recipient.address || !recipient.postalCode || !recipient.city) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Fakturamottagare saknar komplett adress (gatuadress, postnummer och ort).',
        status: 'error',
      });
      return;
    }

    setIsLoading(true);

    try {
      const resolvedRecipient = { ...recipient };
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

  return (
    <FormProvider {...form}>
      <div className="w-full py-24 px-32">
        <div className="flex">
          <div className="w-full flex flex-col gap-32">
            <h2 className="text-h4-sm md:text-h4-md">Engångsfakturering</h2>
            <Divider.Section>Fakturaspecifikationer</Divider.Section>
            <BillingLeaseholder onSelectRecipient={setRecipient} />
            <div>
              <BillingSpecifications />
            </div>
            <div>
              <Divider.Section>Fakturarader</Divider.Section>
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
                  Ny fakturarad
                </Button>
              )}
            </div>
            <div>
              <Button
                onClick={onSubmit}
                loading={isLoading}
                disabled={services.length === 0 || isEditingOrAdding}
                color={'vattjom'}
              >
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
