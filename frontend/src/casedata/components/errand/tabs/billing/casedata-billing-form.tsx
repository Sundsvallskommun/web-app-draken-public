import {
  BillingFormData,
  BillingRecipient,
  BillingServiceItem,
  emptyBillingFormData,
} from '@casedata/interfaces/billing';
import { Role } from '@casedata/interfaces/role';
import {
  getCasedataBillingRecordsForErrand,
  saveCasedataBillingRecord,
} from '@casedata/services/casedata-billing-service';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { getSSNFromPersonId, getStakeholdersByRelation } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider, useSnackbar } from '@sk-web-gui/react';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';
import { AddBillingService } from './add-billing-service.component';
import { BillingLeaseholder } from './billing-leaseholder.component';
import { BillingServiceTable } from './billing-service-table.component';
import { BillingSpecifications } from './billing-specifications.component';
import { BillingTable } from './billing-table.component';

export const CaseDataBillingForm: React.FC = () => {
  const { errand, municipalityId, user, setErrand } = useAppContext();
  const toastMessage = useSnackbar();

  const [billingRecords, setBillingRecords] = useState<CBillingRecord[]>([]);
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

  const { handleSubmit, reset, watch, setValue } = form;
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

  const fetchRecipient = useCallback(async () => {
    if (!errand || !municipalityId) return;

    try {
      const leaseholders = getStakeholdersByRelation(errand, Role.LEASEHOLDER);
      if (leaseholders.length > 0) {
        const leaseholder = leaseholders[0];
        const isOrganization = !!leaseholder.organizationNumber || !!leaseholder.organizationName;

        let personalNumber = '';
        if (!isOrganization && leaseholder.personId) {
          try {
            personalNumber = await getSSNFromPersonId(municipalityId, leaseholder.personId);
          } catch (e) {
            console.error('Failed to fetch personalNumber:', e);
          }
        }

        const recipient: BillingRecipient = {
          name: isOrganization ? '' : `${leaseholder.firstName || ''} ${leaseholder.lastName || ''}`.trim(),
          organizationName: leaseholder.organizationName || '',
          personId: leaseholder.personId || '',
          personalNumber: isOrganization ? '' : personalNumber,
          organizationNumber: leaseholder.organizationNumber || '',
          address: leaseholder.street || '',
          postalCode: leaseholder.zip || '',
          city: leaseholder.city || '',
          role: 'Arrendator',
        };
        setValue('recipient', recipient);
      }
    } catch (error) {
      console.error('Failed to fetch recipient:', error);
    }
  }, [errand, municipalityId, setValue]);

  useEffect(() => {
    fetchBillingRecords();
    fetchRecipient();
  }, [fetchBillingRecords, fetchRecipient]);

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

    if (!data.recipient) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Fakturamottagare saknas. Lägg till en arrendator på ärendet.',
        status: 'error',
      });
      return;
    }

    if (!data.recipient.organizationNumber && !data.recipient.personalNumber) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Fakturamottagare saknar personnummer/organisationsnummer.',
        status: 'error',
      });
      return;
    }

    if (!data.recipient.address || !data.recipient.postalCode || !data.recipient.city) {
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
      await saveCasedataBillingRecord(data, errand, municipalityId);

      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Faktura skapad',
        status: 'success',
      });

      reset({
        ...emptyBillingFormData,
        recipient: data.recipient,
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

  return (
    <FormProvider {...form}>
      <div className="w-full py-24 px-32">
        <div className="flex">
          <div className="w-full flex flex-col gap-32">
            <h2 className="text-h4-sm md:text-h4-md">Engångsfakturering</h2>
            <Divider.Section>Fakturaspecifikationer</Divider.Section>
            <div className="max-w-[59.3rem] flex flex-col gap-8">
              <span className="text-label-medium">Fakturamottagare</span>
              <BillingLeaseholder />
            </div>
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
                  leftIcon={<LucideIcon name="plus" />}
                  onClick={handleStartAddNew}
                  disabled={isEditingOrAdding}
                >
                  Ny fakturarad
                </Button>
              )}
            </div>
            <div>
              <Button
                onClick={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={services.length === 0 || isEditingOrAdding}
                color={'vattjom'}
              >
                Skapa fakturaunderlag
              </Button>
            </div>
            <div className="flex flex-col pt-24">
              <h3 className="text-h3-md pb-16">Skapade fakturaunderlag</h3>
              <BillingTable
                errand={errand}
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
