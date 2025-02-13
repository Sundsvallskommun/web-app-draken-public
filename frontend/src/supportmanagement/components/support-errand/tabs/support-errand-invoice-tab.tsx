import { User } from '@common/interfaces/user';
import { prettyTime } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useSnackbar } from '@sk-web-gui/react';
import BillingForm from '@supportmanagement/components/billing/billing-form.component';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import {
  billingFormSchema,
  emptyBillingRecord,
  getBillingRecord,
  getEmployeeCustomerIdentity,
  getInvoiceRows,
  getOrganization,
  saveBillingRecord,
} from '@supportmanagement/services/support-billing-service';
import {
  ApiSupportErrand,
  getSupportErrandById,
  isSupportErrandLocked,
  SupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  CBillingRecord,
  CBillingRecordStatusEnum,
  CBillingRecordTypeEnum,
} from 'src/data-contracts/backend/data-contracts';

export const SupportErrandInvoiceTab: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const {
    supportErrand,
    user,
    municipalityId,
    setSupportErrand,
  }: {
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: (e: SupportErrand) => void;
    user: User;
  } = useAppContext();

  const [record, setRecord] = useState<CBillingRecord | undefined>(emptyBillingRecord);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resetManager = (manager) => {
    const managerUserName = manager?.parameters?.find((param) => param.key === 'username')?.values[0] || null;
    getEmployeeCustomerIdentity(managerUserName).then((res) => {
      if (res.type === 'INTERNAL') {
        setValue('type', CBillingRecordTypeEnum.INTERNAL);
        setTimeout(() => {
          setValue('invoice.customerId', res.identity.customerId.toString());
        }, 20);
      } else if (res.type === 'EXTERNAL') {
        setValue('type', CBillingRecordTypeEnum.EXTERNAL);
        setValue('recipient.organizationName', res.identity.name);
        setValue('invoice.customerId', res.identity.companyId.toString());
        getOrganization(res.identity.orgNr, res.identity.legalEntityAddressSource).then(({ partyId, address }) => {
          setValue('recipient.partyId', partyId);
          setValue('recipient.addressDetails', address);
        });
      }
      setValue('invoice.customerReference', res.referenceNumber);
      handleChange(
        invoiceSettings.invoiceTypes[0].invoiceType,
        res.type === 'INTERNAL' ? res.identity.customerId.toString() : res.identity.companyId.toString(),
        1,
        res.type === 'INTERNAL'
          ? invoiceSettings.invoiceTypes[0].internal.accountInformation.costCenter
          : invoiceSettings.invoiceTypes[0].external.accountInformation.costCenter,
        res.type === 'INTERNAL'
          ? invoiceSettings.invoiceTypes[0].internal.accountInformation.activity
          : invoiceSettings.invoiceTypes[0].external.accountInformation.activity
      );
    });
    setValue(`extraParameters`, {
      errandNumber: supportErrand.errandNumber,
      errandId: supportErrand.id,
      referenceName: `${manager?.firstName} ${manager?.lastName}`,
    });
  };

  useEffect(() => {
    const existingRecordId =
      supportErrand && supportErrand.externalTags?.find((t) => t.key === 'billingRecordId')?.value;
    if (existingRecordId) {
      getBillingRecord(existingRecordId, municipalityId).then((rec) => {
        setRecord(rec);
        reset(rec);
        setTimeout(() => {
          handleChange(
            rec.invoice.description,
            rec.invoice.customerId,
            rec.invoice.invoiceRows[0].quantity,
            rec.invoice.invoiceRows[0].accountInformation[0].costCenter,
            rec.invoice.invoiceRows[0].accountInformation[0].activity
          );
        }, 0);
      });
    } else {
      setRecord(emptyBillingRecord);
      setValue(`invoice.ourReference`, `${user.firstName} ${user.lastName}`);
      const manager = supportErrand.stakeholders?.find((s) => s.role === 'MANAGER');
      const managerUserName = manager?.parameters?.find((param) => param.key === 'username')?.values[0] || null;
      if (managerUserName) {
        resetManager(manager);
      }
    }
  }, [supportErrand]);

  const formControls = useForm<CBillingRecord>({
    defaultValues: record,
    resolver: yupResolver(billingFormSchema),
    mode: 'onSubmit',
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = formControls;

  const toastMessage = useSnackbar();

  const handleChange = (
    description: string,
    identity: string,
    quantity: number,
    costCenter: string,
    activity: string
  ) => {
    setValue('invoice.description', description);
    const formRows = getInvoiceRows(
      supportErrand.errandNumber,
      description,
      getValues('type'),
      identity,
      quantity,
      costCenter,
      activity
    );
    setValue('invoice.invoiceRows', formRows);
  };

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(supportErrand, user) && record?.status === CBillingRecordStatusEnum.NEW;
    setAllowed(_a);
  }, [user, supportErrand]);

  const onError = (error) => {
    console.error('error', error);
  };

  const onSubmit = () => {
    setIsLoading(true);
    return saveBillingRecord(supportErrand, municipalityId, getValues())
      .then(() => {
        setIsLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fakturan sparades',
          status: 'success',
        });
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när fakturan sparades',
          status: 'error',
        });
      });
  };

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Fakturering</h2>
        <span>Fyll i följande faktureringsunderlag.</span>
        <FormProvider {...formControls}>
          <BillingForm
            resetManager={() => {
              const manager = supportErrand.stakeholders?.find((s) => s.role === 'MANAGER');
              resetManager(manager);
            }}
            handleChange={handleChange}
            setIsLoading={setIsLoading}
          />
        </FormProvider>
        <div className="flex flex-row justify-end gap-md">
          {record.status === CBillingRecordStatusEnum.NEW ? (
            <div>
              <Button
                disabled={isSupportErrandLocked(supportErrand) || !allowed || isLoading}
                onClick={handleSubmit(onSubmit, onError)}
                data-cy="save-invoice-button"
                loading={isLoading}
                loadingText="Sparar"
              >
                Spara
              </Button>
            </div>
          ) : record.status === CBillingRecordStatusEnum.REJECTED ? (
            <Button inverted variant="primary" color="error">
              <LucideIcon name="thumbs-down" /> Avslag
            </Button>
          ) : record.status === CBillingRecordStatusEnum.APPROVED ? (
            <Button inverted variant="primary" color="gronsta">
              <LucideIcon name="check" /> Godkänd
            </Button>
          ) : record.status === CBillingRecordStatusEnum.INVOICED ? (
            <Button disabled inverted variant="primary" color="vattjom">
              <LucideIcon name="check" /> Fakturerad
            </Button>
          ) : null}
        </div>
        {record.status === CBillingRecordStatusEnum.APPROVED ? (
          <span className="flex justify-end">
            <span className="text-small">
              <b>Attesterad av:</b> {record.approvedBy}, {prettyTime(record.approved)}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
};
